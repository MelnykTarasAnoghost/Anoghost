// server/src/chat/index.ts

import type { Server as SocketIOServer } from "socket.io"
import { randomUUID } from "crypto"
import { userSessions, socketToRoomMap, chatRooms, type ChatRoomParticipant } from "./types"
import { setupAuthHandlers } from "./events/auth"
import { setupMessageHandlers } from "./events/messages"
import { setupRoomHandlers } from "./events/rooms"
import { getParticipantsList, getPendingParticipantsList, isRoomCreator } from "../utils/helpers"

export function setupSocketHandlers(io: SocketIOServer) {
  io.on("connection", (socket) => {
    console.log(`[v0] New client connected: ${socket.id} at ${new Date().toISOString()}`)

    // Налаштування обробників з окремих модулів
    setupAuthHandlers(socket, io)
    setupMessageHandlers(socket, io)
    setupRoomHandlers(socket, io)

    // Логіка відключення (залишається тут, оскільки вона залежить від усіх модулів)
    socket.on("disconnect", (reason: string) => {
      try {
        console.log(`[v0] Client disconnected: ${socket.id}, reason: ${reason}, time: ${new Date().toISOString()}`)

        const roomId = socketToRoomMap.get(socket.id)
        console.log(`[v0] Socket ${socket.id} was in room: ${roomId || "none"}`)

        if (roomId) {
          const room = chatRooms.get(roomId)
          if (room) {
            console.log(`[v0] Room ${roomId} found, current participants: ${room.participants.size}`)

            const participant = room.participants.get(socket.id)
            if (participant) {
              console.log(`[v0] Removing participant ${participant.nickname} from room ${room.name}`)

              room.participants.delete(socket.id)
              socket.to(roomId).emit("userLeftRoom", {
                roomId,
                nickname: participant.nickname,
                participants: getParticipantsList(room),
              })

              console.log(`[v0] Participants remaining in room ${roomId}: ${room.participants.size}`)

              if (isRoomCreator(room, socket.id)) {
                console.log(`[v0] Disconnected user was room creator, transferring ownership`)

                const participants = Array.from(room.participants.values()) as ChatRoomParticipant[]
                if (participants.length > 0) {
                  participants.sort((a, b) => a.joinedAt - b.joinedAt)
                  const newCreator = participants[0]
                  room.creatorSocketId = newCreator.socketId
                  room.creatorPublicKey = newCreator.publicKey

                  console.log(`[v0] New room creator: ${newCreator.nickname} (${newCreator.socketId})`)

                  const newCreatorSocket = io.sockets.sockets.get(newCreator.socketId)
                  if (newCreatorSocket) {
                    newCreatorSocket.emit("roomCreatorChanged", {
                      roomId: room.id,
                      isCreator: true,
                      pendingParticipants: getPendingParticipantsList(room),
                    })
                  }
                  io.to(roomId).emit("message", {
                    id: randomUUID(),
                    sender: "system",
                    text: `${newCreator.nickname} is now the room admin.`,
                    timestamp: Date.now(),
                  })
                } else {
                  // **FIXED**: Only delete the room if it's empty AND private
                  if (room.isPrivate) {
                    chatRooms.delete(roomId)
                    console.log(`[v0] Private room ${room.name} (ID: ${roomId}) is empty and has been removed.`)
                  } else {
                    console.log(`[v0] Public room ${room.name} (ID: ${roomId}) is empty and will persist.`)
                  }
                }
              }
            } else {
              console.log(`[v0] Socket ${socket.id} was not found as participant in room ${roomId}`)
            }

            if (room.pendingParticipants.has(socket.id)) {
              console.log(`[v0] Removing ${socket.id} from pending participants`)
              room.pendingParticipants.delete(socket.id)
              if (room.creatorSocketId) {
                const creatorSocket = io.sockets.sockets.get(room.creatorSocketId)
                if (creatorSocket) {
                  creatorSocket.emit("pendingJoinRequest", {
                    roomId: room.id,
                    pendingParticipants: getPendingParticipantsList(room),
                  })
                }
              }
            }
          } else {
            console.log(`[v0] Room ${roomId} not found in chatRooms map`)
          }
          socketToRoomMap.delete(socket.id)
        }

        const userSession = userSessions.get(socket.id)
        if (userSession) {
          console.log(`[v0] Removing user session for ${socket.id}, had ${userSession.roomTokens.length} room tokens`)
        }
        userSessions.delete(socket.id)
      } catch (error) {
        console.error(`[v0] Error in disconnect handler for ${socket.id}:`, error)
      }
    })

    socket.on("error", (error: Error) => {
      console.error(`[v0] Socket error for ${socket.id}:`, error.message, `at ${new Date().toISOString()}`)
    })
  })
}
