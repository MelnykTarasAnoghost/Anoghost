// server/src/chat/events/messages.ts

import { Server as SocketIOServer, Socket } from "socket.io";
import { randomUUID } from "crypto";
import {
    userSessions,
    socketToRoomMap,
    pendingMessages,
    chatRooms,
    ChatRoomParticipant,
    filesStorage,
    MAX_CHUNK_SIZE,
    MAX_MESSAGE_SIZE,
    FILE_EXPIRATION_TIME,
    StoredFile,
    messageOwnership
} from "../types";
import { sanitizeInput } from "../../utils/helpers";

export function setupMessageHandlers(socket: Socket, io: SocketIOServer) {

    socket.on("sendMessage", (data: { text: string; type?: string; expiresAt?: number }) => {
        try {
            const { text, type = "text", expiresAt } = data;
            const userSession = userSessions.get(socket.id);
            if (!userSession) {
                socket.emit("error", { message: "You must register before sending messages" });
                return;
            }
            const roomId = socketToRoomMap.get(socket.id);
            if (!roomId) {
                socket.emit("error", { message: "You must join a room before sending messages" });
                return;
            }
            const room = chatRooms.get(roomId);
            if (!room) {
                socket.emit("error", { message: "Room not found" });
                return;
            }
            const participant = room.participants.get(socket.id);
            if (!participant) {
                socket.emit("error", { message: "You are not a participant in this room" });
                return;
            }

            const sanitizedText = sanitizeInput(text);
            if (!sanitizedText) {
                socket.emit("error", { message: "Message cannot be empty" });
                return;
            }
            const messageId = randomUUID();
            const timestamp = Date.now();
            const message = {
                id: messageId,
                sender: participant.nickname,
                text: sanitizedText,
                type,
                timestamp,
                expiresAt,
            };

            // Зберігаємо право власності на повідомлення, якщо чат публічний
            if (!room.isPrivate) {
                messageOwnership.set(messageId, socket.id);
                // Встановлюємо таймер для очищення, щоб не засмічувати пам'ять
                setTimeout(() => {
                    messageOwnership.delete(messageId);
                }, FILE_EXPIRATION_TIME);
            }

            io.to(roomId).emit("message", message);
            if (expiresAt) {
                const expirationTime = expiresAt - Date.now();
                if (expirationTime > 0) {
                    setTimeout(() => {
                        io.to(roomId).emit("messageExpired", { messageId });
                    }, expirationTime);
                }
            }
        } catch (error) {
            console.error("Error in sendMessage:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    });

    socket.on("startLargeMessage", (data: { totalChunks: number; fileName: string; fileSize: number; allowDownload: boolean; iv: string; authTag: string }) => {
        try {
            const { totalChunks, fileName, fileSize, allowDownload, iv, authTag } = data;
            const userSession = userSessions.get(socket.id);
            if (!userSession) {
                socket.emit("error", { message: "You must register before sending data" });
                return;
            }
            const roomId = socketToRoomMap.get(socket.id);
            if (!roomId) {
                socket.emit("error", { message: "You must join a room before sending data" });
                return;
            }
            const room = chatRooms.get(roomId);
            if (!room || !room.participants.has(socket.id)) {
                socket.emit("error", { message: "You are not a participant in this room" });
                return;
            }

            if (totalChunks <= 0 || totalChunks > 1000) {
                socket.emit("error", { message: "Invalid chunk count" });
                return;
            }
            if (fileSize > MAX_MESSAGE_SIZE) {
                socket.emit("error", { message: "File size exceeds the maximum limit" });
                return;
            }
            const messageId = randomUUID();
            pendingMessages.set(messageId, {
                id: messageId,
                chunks: new Map(),
                totalChunks,
                receivedChunks: 0,
                senderId: socket.id,
                timestamp: Date.now(),
                fileName,
                fileSize,
                allowDownload,
                iv,
                authTag
            });
            socket.emit("largeMessageInitialized", { messageId, fileName });
        } catch (error) {
            console.error("Error in startLargeMessage:", error);
            socket.emit("error", { message: "Failed to initialize large message" });
        }
    });

    socket.on("messageChunk", async (data: { messageId: string; chunkIndex: number; chunk: Buffer; final: boolean }) => {
        try {
            const { messageId, chunkIndex, chunk, final } = data;
            const pendingMessage = pendingMessages.get(messageId);
            if (!pendingMessage) {
                socket.emit("error", { message: "Invalid message ID" });
                return;
            }
            if (pendingMessage.senderId !== socket.id) {
                socket.emit("error", { message: "You are not the sender of this message" });
                return;
            }
            if (chunkIndex < 0 || chunkIndex >= pendingMessage.totalChunks) {
                socket.emit("error", { message: "Invalid chunk index" });
                return;
            }
            if (!Buffer.isBuffer(chunk)) {
                socket.emit("error", { message: "Invalid chunk data" });
                return;
            }
            
            const newChunks = pendingMessage.chunks;
            newChunks.set(chunkIndex, chunk);

            const newPendingMessage = {
                ...pendingMessage,
                chunks: newChunks,
                receivedChunks: pendingMessage.receivedChunks + 1
            }
            pendingMessages.set(messageId, newPendingMessage);

            const progress = Math.floor((newPendingMessage.receivedChunks / newPendingMessage.totalChunks) * 100);
            socket.emit("chunkProgress", { messageId, progress });

            if (final || newPendingMessage.receivedChunks === newPendingMessage.totalChunks) {
                const roomId = socketToRoomMap.get(socket.id);
                if (!roomId) {
                    pendingMessages.delete(messageId);
                    return;
                }
                const userSession = userSessions.get(socket.id);
                if (!userSession) {
                    pendingMessages.delete(messageId);
                    return;
                }

                const room = chatRooms.get(roomId);
                if (!room) {
                    pendingMessages.delete(messageId);
                    return;
                }

                const participant = room.participants.get(socket.id);
                if (!participant) {
                    pendingMessages.delete(messageId);
                    return;
                }

                const orderedChunks: Buffer[] = [];
                for (let i = 0; i < newPendingMessage.totalChunks; i++) {
                    const chunk = newPendingMessage.chunks.get(i);
                    if (chunk) {
                        orderedChunks.push(chunk);
                    }
                }
                const completeData = Buffer.concat(orderedChunks);
                
                const fileId = randomUUID();

                const fileExpiresAt = Date.now() + FILE_EXPIRATION_TIME;
                const cleanupTimer = setTimeout(() => {
                    filesStorage.delete(fileId);
                    console.log(`File ${fileId} expired and was deleted.`);
                    io.to(roomId).emit("fileExpired", { fileId });
                }, FILE_EXPIRATION_TIME);

                filesStorage.set(fileId, {
                    encryptedContent: completeData, // Зберігаємо зашифрований вміст
                    iv: Buffer.from(newPendingMessage.iv, 'base64'),
                    authTag: Buffer.from(newPendingMessage.authTag, 'base64'),
                    name: newPendingMessage.fileName,
                    size: newPendingMessage.fileSize,
                    allowDownload: newPendingMessage.allowDownload,
                    uploadedAt: Date.now(),
                    cleanupTimer,
                });

                // Зберігаємо право власності на файл, якщо чат публічний
                if (!room.isPrivate) {
                    messageOwnership.set(fileId, socket.id);
                    setTimeout(() => {
                        messageOwnership.delete(fileId);
                    }, FILE_EXPIRATION_TIME);
                }

                io.to(roomId).emit("fileReceived", {
                    id: fileId,
                    sender: participant.nickname,
                    fileName: newPendingMessage.fileName,
                    fileSize: newPendingMessage.fileSize,
                    timestamp: newPendingMessage.timestamp,
                    allowDownload: newPendingMessage.allowDownload,
                });

                pendingMessages.delete(messageId);
            }
        } catch (error) {
            console.error("Error in messageChunk:", error);
            socket.emit("error", { message: "Failed to process message chunk" });
        }
    });

    socket.on("sendEncryptedMessage",
        (data: { encryptedMessages: Record<string, any>; expiresAt?: number; senderId?: string; fileAttachment?: { fileId: string; fileName: string; fileSize: number; allowDownload: boolean } }) => {
            try {
                const { encryptedMessages, expiresAt, fileAttachment } = data;
                const userSession = userSessions.get(socket.id);
                if (!userSession) {
                    socket.emit("error", { message: "You must register before sending messages" });
                    return;
                }
                const roomId = socketToRoomMap.get(socket.id);
                if (!roomId) {
                    socket.emit("error", { message: "You must join a room before sending messages" });
                    return;
                }
                const room = chatRooms.get(roomId);
                if (!room) {
                    socket.emit("error", { message: "Room not found" });
                    return;
                }
                const participant = room.participants.get(socket.id);
                if (!participant) {
                    socket.emit("error", { message: "You are not a participant in this room" });
                    return;
                }

                const messageId = randomUUID();
                const timestamp = Date.now();
                
                // Зберігаємо право власності на повідомлення, якщо чат публічний
                if (!room.isPrivate) {
                    messageOwnership.set(messageId, socket.id);
                    // Встановлюємо таймер для очищення, щоб не засмічувати пам'ять
                    setTimeout(() => {
                        messageOwnership.delete(messageId);
                    }, FILE_EXPIRATION_TIME);
                }

                if (fileAttachment) {
                    const fileData = filesStorage.get(fileAttachment.fileId);
                    if (!fileData) {
                        socket.emit("error", { message: `Attached file (ID: ${fileAttachment.fileId}) not found or expired on server.` });
                        return;
                    }
                    if (fileData.name !== fileAttachment.fileName || fileData.size !== fileAttachment.fileSize) {
                        socket.emit("error", { message: `File metadata mismatch for ID: ${fileAttachment.fileId}.` });
                        return;
                    }
                }
                for (const [recipientId, encryptedMessage] of Object.entries(encryptedMessages)) {
                    const recipientSocket = io.sockets.sockets.get(recipientId);
                    if (recipientSocket) {
                        recipientSocket.emit("encryptedMessage", {
                            id: messageId,
                            sender: participant.nickname,
                            senderId: socket.id,
                            encryptedContent: encryptedMessage,
                            timestamp,
                            expiresAt,
                            fileAttachment: fileAttachment ? {
                                fileId: fileAttachment.fileId,
                                fileName: fileAttachment.fileName,
                                fileSize: fileAttachment.fileSize,
                                allowDownload: fileAttachment.allowDownload,
                            } : undefined,
                        });
                    }
                }
                
                if (encryptedMessages[socket.id]) {
                    socket.emit("encryptedMessage", {
                        id: messageId,
                        sender: participant.nickname,
                        senderId: socket.id,
                        encryptedContent: encryptedMessages[socket.id],
                        timestamp,
                        expiresAt,
                        fileAttachment: fileAttachment ? {
                            fileId: fileAttachment.fileId,
                            fileName: fileAttachment.fileName,
                            fileSize: fileAttachment.fileSize,
                            allowDownload: fileAttachment.allowDownload,
                        } : undefined,
                    });
                }
                if (expiresAt) {
                    const expirationTime = expiresAt - Date.now();
                    if (expirationTime > 0) {
                        setTimeout(async () => {
                            for (const recipientId of Object.keys(encryptedMessages)) {
                                const recipientSocket = io.sockets.sockets.get(recipientId);
                                if (recipientSocket) {
                                    recipientSocket.emit("messageExpired", { messageId });
                                }
                            }
                        }, expirationTime);
                    }
                }
            } catch (error) {
                console.error("Error in sendEncryptedMessage:", error);
                socket.emit("error", { message: "Failed to send encrypted message" });
            }
        }
    );

    socket.on("requestPublicKey", (data: { requesterId: string }) => {
        try {
            const { requesterId } = data;
            const userSession = userSessions.get(socket.id);
            if (!userSession) {
                return;
            }
            const requesterSocket = io.sockets.sockets.get(requesterId);
            if (requesterSocket) {
                socket.emit("publicKeyRequested", {
                    requesterId,
                });
            }
        } catch (error) {
            console.error("Error in requestPublicKey:", error);
        }
    });

    socket.on("userTyping", (data: { roomId: string }) => {
        try {
            const { roomId } = data;
            const userSession = userSessions.get(socket.id);
            if (!userSession) {
                return;
            }
            const room = chatRooms.get(roomId);
            if (!room) {
                return;
            }
            const participant = room.participants.get(socket.id);
            if (!participant) {
                return;
            }
            socket.to(roomId).emit("userTypingStatus", {
                userId: socket.id,
                nickname: participant.nickname,
                isTyping: true,
            });
        } catch (error) {
            console.error("Error in userTyping handler:", error);
        }
    });

    socket.on("userStoppedTyping", (data: { roomId: string }) => {
        try {
            const { roomId } = data;
            const userSession = userSessions.get(socket.id);
            if (!userSession) {
                return;
            }
            const room = chatRooms.get(roomId);
            if (!room) {
                return;
            }
            const participant = room.participants.get(socket.id);
            if (!participant) {
                return;
            }
            socket.to(roomId).emit("userTypingStatus", {
                userId: socket.id,
                nickname: participant.nickname,
                isTyping: false,
            });
        } catch (error) {
            console.error("Error in userStoppedTyping handler:", error);
        }
    });

    socket.on("deleteMessage", (data: { roomId: string; messageId: string }) => {
        try {
            const { roomId, messageId } = data;
            const userSession = userSessions.get(socket.id);
            if (!userSession) {
                socket.emit("error", { message: "You must be a registered user to delete messages" });
                return;
            }
            const room = chatRooms.get(roomId);
            if (!room) {
                socket.emit("error", { message: "Room not found" });
                return;
            }
            const participant = room.participants.get(socket.id);
            if (!participant) {
                socket.emit("error", { message: "You are not a participant in this room" });
                return;
            }

            // Перевіряємо, чи кімната публічна
            if (!room.isPrivate) {
                const messageSenderId = messageOwnership.get(messageId);
                // Перевіряємо, чи відправник повідомлення співпадає з поточним користувачем
                if (messageSenderId && messageSenderId === socket.id) {
                    console.log(`User ${participant.nickname} successfully deleted message ${messageId} in public room ${roomId}`);
                    io.to(roomId).emit("messageDeleted", { messageId });
                    // Видаляємо запис про повідомлення з тимчасового сховища
                    messageOwnership.delete(messageId);
                } else {
                    console.log(`User ${participant.nickname} tried to delete a message they did not send.`);
                    socket.emit("error", { message: "You can only delete your own messages." });
                }
            } else {
                // У приватних чатах видалення відбувається за існуючою логікою
                console.log(`User ${participant.nickname} requested to delete message ${messageId} in private room ${roomId}`);
                io.to(roomId).emit("messageDeleted", { messageId });
            }

        } catch (error) {
            console.error("Error in deleteMessage handler:", error);
            socket.emit("error", { message: "Failed to delete message" });
        }
    });

    socket.on("requestFileDownload", (data: { fileId: string }) => {
        try {
            const { fileId } = data;
            const fileData = filesStorage.get(fileId);

            if (!fileData) {
                socket.emit("error", { message: "File not found or has expired." });
                return;
            }
            
            if (!fileData.allowDownload) {
                socket.emit("error", { message: "Downloading this file is not allowed." });
                return;
            }
            
            // Сервер тепер просто передає зашифровані дані
            socket.emit("fileDownloaded", {
                fileId: fileId,
                fileName: fileData.name,
                fileData: fileData.encryptedContent,
                iv: fileData.iv,
                authTag: fileData.authTag,
            });
            
        } catch (error) {
            console.error("Error in requestFileDownload handler:", error);
            socket.emit("error", { message: "Failed to download file." });
        }
    });
}