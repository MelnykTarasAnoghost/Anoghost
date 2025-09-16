import type { Server as SocketIOServer, Socket } from "socket.io"
import { randomUUID } from "crypto"
import { userSessions, socketToRoomMap, chatRooms, messageOwnership } from "../types"
import { sanitizeInput } from "../../utils/helpers"

const fileTransferState = new Map<string, { encryptedKeys: Record<string, string> }>();

export function setupMessageHandlers(socket: Socket, io: SocketIOServer) {
  socket.on("sendMessage", (data: { text: string; type?: string; expiresAt?: number }) => {
    try {
      const { text, type = "text", expiresAt } = data
      const userSession = userSessions.get(socket.id)
      if (!userSession) {
        socket.emit("error", { message: "You must register before sending messages" })
        return
      }
      const roomId = socketToRoomMap.get(socket.id)
      if (!roomId) {
        socket.emit("error", { message: "You must join a room before sending messages" })
        return
      }
      const room = chatRooms.get(roomId)
      if (!room) {
        socket.emit("error", { message: "Room not found" })
        return
      }
      const participant = room.participants.get(socket.id)
      if (!participant) {
        socket.emit("error", { message: "You are not a participant in this room" })
        return
      }

      const sanitizedText = sanitizeInput(text)
      if (!sanitizedText) {
        socket.emit("error", { message: "Message cannot be empty" })
        return
      }
      const messageId = randomUUID()
      const timestamp = Date.now()
      const message = {
        id: messageId,
        sender: participant.nickname,
        text: sanitizedText,
        type,
        timestamp,
        expiresAt,
      }

      // Зберігаємо право власності на повідомлення, якщо чат публічний
      if (!room.isPrivate) {
        messageOwnership.set(messageId, socket.id)
        // Встановлюємо таймер для очищення, щоб не засмічувати пам'ять
        setTimeout(
          () => {
            messageOwnership.delete(messageId)
          },
          5 * 60 * 1000,
        )
      }

      io.to(roomId).emit("message", message)
      if (expiresAt) {
        const expirationTime = expiresAt - Date.now()
        if (expirationTime > 0) {
          setTimeout(() => {
            io.to(roomId).emit("messageExpired", { messageId })
          }, expirationTime)
        }
      }
    } catch (error) {
      console.error("Error in sendMessage:", error)
      socket.emit("error", { message: "Failed to send message" })
    }
  })

  // Add this new event handler inside your setupMessageHandlers function
  socket.on("fileChunkStart", (data: {
    messageId: string;
    fileName: string;
    fileType: string;
    totalChunks: number;
    encryptedKeys: Record<string, string>;
    iv: string;
  }) => {
    try {
        const roomId = socketToRoomMap.get(socket.id);
        if (!roomId) return;

        const room = chatRooms.get(roomId);
        if (!room) return;
        
        const participant = room.participants.get(socket.id);
        if (!participant) return;

        // Store the encrypted keys for this file transfer
        fileTransferState.set(data.messageId, { encryptedKeys: data.encryptedKeys });

        // Notify other clients in the room that a file transfer is starting
        // console.log(data.encryptedKeys)
        socket.to(roomId).emit("fileChunkStart", {
            messageId: data.messageId,
            fileName: data.fileName,
            fileType: data.fileType,
            totalChunks: data.totalChunks,
            sender: participant.nickname,
            timestamp: Date.now(),
            iv: data.iv,
        });

    } catch (error) {
        console.error("[SERVER] Error in fileChunkStart handler:", error);
    }
  });
  socket.on(
    "sendFileChunk",
    (data: {
      messageId: string
      chunkIndex: number
      chunk: Buffer
      final: boolean
      fileName?: string
      fileSize?: number
      allowDownload?: boolean
      iv?: string
      authTag?: string
      totalChunks?: number
    }) => {
      try {
        const { messageId, chunkIndex, chunk, final, fileName, fileSize, allowDownload, iv, authTag, totalChunks } = data
  
        const userSession = userSessions.get(socket.id)
        const roomId = socketToRoomMap.get(socket.id)
        if (!userSession || !roomId) return
  
        const room = chatRooms.get(roomId)
        if (!room || !room.participants.has(socket.id)) return
  
        const senderNickname = room.participants.get(socket.id)?.nickname
  
        const state = fileTransferState.get(messageId);
        // Loop through all participants in the room
        for (const [participantId, participant] of room.participants.entries()) {
            // Don't send the chunk back to the sender
            if (participantId === socket.id) continue;
            // if(chunkIndex < 1) {
            //   console.log(participantId)
            //   console.log(participant)
            //   console.log(state)
            // }

            // Find the specific encrypted key for this recipient
            const encryptedKeyForRecipient = state?.encryptedKeys?.[participantId];

            // console.log(encryptedKeyForRecipient)
            const broadcastData = {
                messageId,
                chunkIndex,
                chunk,
                final,
                senderId: socket.id,
                senderNickname,
                fileName,
                fileSize,
                allowDownload,
                totalChunks,
                // Only include these on the first chunk
                iv: chunkIndex === 0 ? iv : undefined,
                authTag: chunkIndex === 0 ? authTag : undefined,
                encryptedKey: chunkIndex === 0 ? encryptedKeyForRecipient : undefined,
            };

            // Emit directly to the specific recipient's socket
            io.to(participantId).emit("fileChunkReceived", broadcastData);
        }
  
        // if (final) {
        //   console.log(`[SERVER] File transfer complete for file ${messageId}`)
        // }
      } catch (error) {
        console.error("[SERVER] Error in sendFileChunk handler:", error)
        socket.emit("error", { message: "Failed to forward file chunk." })
      }
    },
  )
  

  socket.on(
    "sendEncryptedMessage",
    (data: {
      encryptedMessages: Record<string, any>
      expiresAt?: number
      senderId?: string
      clientMessageId?: string // <-- Додано clientMessageId
    }) => {
      try {
        const { encryptedMessages, expiresAt, clientMessageId } = data
        const userSession = userSessions.get(socket.id)
        if (!userSession) {
          socket.emit("error", { message: "You must register before sending messages" })
          return
        }
        const roomId = socketToRoomMap.get(socket.id)
        if (!roomId) {
          socket.emit("error", { message: "You must join a room before sending messages" })
          return
        }
        const room = chatRooms.get(roomId)
        if (!room) {
          socket.emit("error", { message: "Room not found" })
          return
        }
        const participant = room.participants.get(socket.id)
        if (!participant) {
          socket.emit("error", { message: "You are not a participant in this room" })
          return
        }

        const serverMessageId = randomUUID() // <-- Тепер це serverMessageId
        const timestamp = Date.now()

        // Зберігаємо право власності на повідомлення, якщо чат публічний
        if (!room.isPrivate) {
          messageOwnership.set(serverMessageId, socket.id)
          // Встановлюємо таймер для очищення
          setTimeout(
            () => {
              messageOwnership.delete(serverMessageId)
            },
            5 * 60 * 1000,
          )
        }

        // ✅ Відправляємо ACK назад лише відправнику
        if (clientMessageId) {
            socket.emit("messageSentAck", { clientMessageId, serverMessageId });
        }


        for (const [recipientId, encryptedMessage] of Object.entries(encryptedMessages)) {
          const recipientSocket = io.sockets.sockets.get(recipientId)
          if (recipientSocket) {
            recipientSocket.emit("encryptedMessage", {
              id: serverMessageId, // <-- Використовуємо serverMessageId
              sender: participant.nickname,
              senderId: socket.id,
              encryptedContent: encryptedMessage,
              timestamp,
              expiresAt,
            })
          }
        }

        if (encryptedMessages[socket.id]) {
          socket.emit("encryptedMessage", {
            id: serverMessageId, // <-- Використовуємо serverMessageId
            sender: participant.nickname,
            senderId: socket.id,
            encryptedContent: encryptedMessages[socket.id],
            timestamp,
            expiresAt,
          })
        }
        if (expiresAt) {
          const expirationTime = expiresAt - Date.now()
          if (expirationTime > 0) {
            setTimeout(async () => {
              for (const recipientId of Object.keys(encryptedMessages)) {
                const recipientSocket = io.sockets.sockets.get(recipientId)
                if (recipientSocket) {
                  recipientSocket.emit("messageExpired", { messageId: serverMessageId }) // <-- Використовуємо serverMessageId
                }
              }
            }, expirationTime)
          }
        }
      } catch (error) {
        console.error("Error in sendEncryptedMessage:", error)
        socket.emit("error", { message: "Failed to send encrypted message" })
      }
    },
  )

  socket.on("sharePublicKey", (data: { roomId: string; publicKeyJwk: any }) => {
    try {
      // console.log(`[SERVER] Received 'sharePublicKey' from socket ${socket.id} for room ${data.roomId}`);
      const userSession = userSessions.get(socket.id);
      if (!userSession) {
        console.error(`[SERVER] sharePublicKey: User session not found for socket ${socket.id}`);
        return;
      }

      const currentRoomId = socketToRoomMap.get(socket.id);
      if (!currentRoomId || currentRoomId !== data.roomId) {
        console.error(`[SERVER] sharePublicKey: Socket ${socket.id} is not in room ${data.roomId}`);
        return;
      }
      
      // Broadcast the public key to all OTHER clients in the room
      socket.to(currentRoomId).emit("publicKeyShared", {
        userId: socket.id,
        publicKeyJwk: data.publicKeyJwk,
      });
      // console.log(`[SERVER] Broadcasted 'publicKeyShared' to room ${currentRoomId} for user ${socket.id}`);

    } catch (error) {
      console.error("[SERVER] Error in sharePublicKey handler:", error);
    }
  });

  // THIS HANDLER EXISTS - ADD LOGS TO IT
  socket.on("requestPublicKey", (data: { roomId: string }) => {
    try {
      // console.log(`[SERVER] Received 'requestPublicKey' from socket ${socket.id} for room ${data.roomId}`);
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;

      const currentRoomId = socketToRoomMap.get(socket.id);
      if (!currentRoomId || currentRoomId !== data.roomId) {
        console.warn(`[SERVER] Socket ${socket.id} requested keys for wrong room ${data.roomId}`);
        return;
      }
      
      socket.to(currentRoomId).emit("publicKeyRequested", {
        requesterId: socket.id
      });
      // console.log(`[SERVER] Broadcasted 'publicKeyRequested' to room ${currentRoomId} on behalf of ${socket.id}`);
    } catch (error) {
      console.error("[SERVER] Error in requestPublicKey handler:", error);
    }
  });

  socket.on("userTyping", (data: { roomId: string }) => {
    try {
      const { roomId } = data
      const userSession = userSessions.get(socket.id)
      if (!userSession) {
        return
      }
      const room = chatRooms.get(roomId)
      if (!room) {
        return
      }
      const participant = room.participants.get(socket.id)
      if (!participant) {
        return
      }
      socket.to(roomId).emit("userTypingStatus", {
        userId: socket.id,
        nickname: participant.nickname,
        isTyping: true,
      })
    } catch (error) {
      console.error("Error in userTyping handler:", error)
    }
  })

  socket.on("userStoppedTyping", (data: { roomId: string }) => {
    try {
      const { roomId } = data
      const userSession = userSessions.get(socket.id)
      if (!userSession) {
        return
      }
      const room = chatRooms.get(roomId)
      if (!room) {
        return
      }
      const participant = room.participants.get(socket.id)
      if (!participant) {
        return
      }
      socket.to(roomId).emit("userTypingStatus", {
        userId: socket.id,
        nickname: participant.nickname,
        isTyping: false,
      })
    } catch (error) {
      console.error("Error in userStoppedTyping handler:", error)
    }
  })

  socket.on("deleteMessage", (data: { roomId: string; messageId: string }) => {
    try {
      const { roomId, messageId } = data
      const userSession = userSessions.get(socket.id)
      if (!userSession) {
        socket.emit("error", { message: "You must be a registered user to delete messages" })
        return
      }
      const room = chatRooms.get(roomId)
      if (!room) {
        socket.emit("error", { message: "Room not found" })
        return
      }
      const participant = room.participants.get(socket.id)
      if (!participant) {
        socket.emit("error", { message: "You are not a participant in this room" })
        return
      }

      // Перевіряємо, чи кімната публічна
      if (!room.isPrivate) {
        const messageSenderId = messageOwnership.get(messageId)
        // Перевіряємо, чи відправник повідомлення співпадає з поточним користувачем
        if (messageSenderId && messageSenderId === socket.id) {
          // console.log(`User ${participant.nickname} successfully deleted message ${messageId} in public room ${roomId}`)
          io.to(roomId).emit("messageDeleted", { messageId })
          // Видаляємо запис про повідомлення з тимчасового сховища
          messageOwnership.delete(messageId)
        } else {
          // console.log(messageOwnership)
          // console.log(`User ${participant.nickname} tried to delete a message they did not send., ${messageSenderId}, ${messageId}, ${socket.id}`)
          socket.emit("error", { message: "You can only delete your own messages." })
        }
      } else {
        // У приватних чатах видалення відбувається за існуючою логікою
        // console.log(`User ${participant.nickname} requested to delete message ${messageId} in private room ${roomId}`)
        io.to(roomId).emit("messageDeleted", { messageId })
      }
    } catch (error) {
      console.error("Error in deleteMessage handler:", error)
      socket.emit("error", { message: "Failed to delete message" })
    }
  })
}
