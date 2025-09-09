// server/src/chat/index.ts

import { Server as SocketIOServer } from "socket.io";
import { randomUUID } from "crypto";
import {
  userSessions,
  socketToRoomMap,
  pendingMessages,
  chatRooms,
  ChatRoomParticipant
} from "./types";
import { setupAuthHandlers } from "./events/auth";
import { setupMessageHandlers } from "./events/messages";
import { setupRoomHandlers } from "./events/rooms";
import { getParticipantsList, getPendingParticipantsList, isRoomCreator } from "../utils/helpers";

export const filesStorage = new Map<string, any>(); // Тепер експортується

export function setupSocketHandlers(io: SocketIOServer) {
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Налаштування обробників з окремих модулів
    setupAuthHandlers(socket, io);
    setupMessageHandlers(socket, io);
    setupRoomHandlers(socket, io);

    // Логіка відключення (залишається тут, оскільки вона залежить від усіх модулів)
    socket.on("disconnect", (reason: string) => {
      try {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
        const roomId = socketToRoomMap.get(socket.id);
        if (roomId) {
          const room = chatRooms.get(roomId);
          if (room) {
            const participant = room.participants.get(socket.id);
            if (participant) {
              room.participants.delete(socket.id);
              socket.to(roomId).emit("userLeftRoom", {
                nickname: participant.nickname,
                participants: getParticipantsList(room),
              });
              if (isRoomCreator(room, socket.id)) {
                const participants = Array.from(room.participants.values()) as ChatRoomParticipant[];
                if (participants.length > 0) {
                  participants.sort((a, b) => a.joinedAt - b.joinedAt);
                  const newCreator = participants[0];
                  room.creatorSocketId = newCreator.socketId;
                  room.creatorPublicKey = newCreator.publicKey;
                  const newCreatorSocket = io.sockets.sockets.get(newCreator.socketId);
                  if (newCreatorSocket) {
                    newCreatorSocket.emit("roomCreatorChanged", {
                      roomId: room.id,
                      isCreator: true,
                      pendingParticipants: getPendingParticipantsList(room),
                    });
                  }
                  io.to(roomId).emit("message", {
                    id: randomUUID(),
                    sender: "system",
                    text: `${newCreator.nickname} is now the room admin.`,
                    timestamp: Date.now(),
                  });
                } else {
                  chatRooms.delete(roomId);
                  console.log(`Room ${room.name} (ID: ${roomId}) is empty and has been removed.`);
                }
              }
            }
            if (room.pendingParticipants.has(socket.id)) {
              room.pendingParticipants.delete(socket.id);
              if (room.creatorSocketId) {
                const creatorSocket = io.sockets.sockets.get(room.creatorSocketId);
                if (creatorSocket) {
                  creatorSocket.emit("pendingJoinRequest", {
                    roomId: room.id,
                    pendingParticipants: getPendingParticipantsList(room),
                  });
                }
              }
            }
          }
          socketToRoomMap.delete(socket.id);
        }
        userSessions.delete(socket.id);
        
        // Видалення всіх пов'язаних повідомлень
        for (const [messageId, message] of pendingMessages.entries()) {
          if (message.senderId === socket.id) {
            pendingMessages.delete(messageId);
          }
        }
      } catch (error) {
        console.error("Error in disconnect handler:", error);
      }
    });

    socket.on("error", (error: Error) => {
      console.error(`Socket error for ${socket.id}:`, error.message);
    });
  });
}