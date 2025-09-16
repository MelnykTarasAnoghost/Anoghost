import type { Server as SocketIOServer, Socket } from "socket.io"
import { randomUUID } from "crypto"
import { userSessions, chatRooms, socketToRoomMap, type ChatRoom } from "../types"
import {
  sanitizeInput,
  generateRoomToken,
  getParticipantsList,
  getPendingParticipantsList,
  isRoomCreator,
  isOriginalRoomCreator,
  joinRoomDirectly,
  validateNickname,
} from "../../utils/helpers"
import { validateGhostId } from "../../utils/crypto"
import { config } from "../../config"

export function setupRoomHandlers(socket: Socket, io: SocketIOServer) {
  socket.on("createChatRoom", (data: { roomName: string; nickname: string; isPrivate: boolean }) => {
    try {
      console.log(`[v0] Room creation request from ${socket.id}:`, data)

      const userSession = userSessions.get(socket.id)
      if (!userSession) {
        console.log(`[v0] Room creation failed - no user session for ${socket.id}`)
        socket.emit("error", {
          message: "You must register before creating a room",
        })
        return
      }
      const { roomName, nickname, isPrivate = false } = data
      const sanitizedRoomName = sanitizeInput(roomName || "Unnamed Room")
      if (!sanitizedRoomName || sanitizedRoomName.length < 3 || sanitizedRoomName.length > 30) {
        socket.emit("error", {
          message: "Room name must be 3-30 characters",
        })
        return
      }
      const sanitizedNickname = sanitizeInput(nickname || "Anonymous")
      if (!validateNickname(sanitizedNickname)) {
        socket.emit("error", { message: "Nickname must be 3-20 alphanumeric characters" })
        return
      }

      const roomId = randomUUID()
      const roomToken = generateRoomToken(roomId, userSession.publicKey)
      const newRoom: ChatRoom = {
        id: roomId,
        name: sanitizedRoomName,
        createdAt: Date.now(),
        creatorPublicKey: userSession.publicKey,
        creatorSocketId: socket.id,
        participants: new Map(),
        pendingParticipants: new Map(),
        accessTokens: new Set([roomToken]),
        isPrivate,
      }
      newRoom.participants.set(socket.id, {
        socketId: socket.id,
        publicKey: userSession.publicKey,
        nickname: sanitizedNickname,
        joinedAt: Date.now(),
      })
      chatRooms.set(roomId, newRoom)
      socketToRoomMap.set(socket.id, roomId)
      userSession.roomTokens.push(roomToken)
      socket.join(roomId)
      console.log(`Room created: ${sanitizedRoomName} (ID: ${roomId}) by ${sanitizedNickname}`)
      socket.emit("roomCreated", {
        roomId: newRoom.id,
        roomName: newRoom.name,
        accessToken: roomToken,
        isPrivate: newRoom.isPrivate,
        isCreator: true,
        participants: getParticipantsList(newRoom),
      })
      console.log(`[v0] Room created successfully: ${sanitizedRoomName} (ID: ${roomId}) by ${sanitizedNickname}`)
    } catch (error) {
      console.error(`[v0] Error in createChatRoom for ${socket.id}:`, error)
      socket.emit("error", { message: "Failed to create chat room" })
    }
  })

  socket.on("checkActiveRooms", (data: { roomIds: string[] }, callback) => {
    try {
      // console.log(`[v0] checkActiveRooms request from ${socket.id}:`, data)

      const { roomIds } = data
      if (!Array.isArray(roomIds)) {
        console.log(`[v0] Invalid roomIds format from ${socket.id}:`, typeof roomIds)
        if (callback) callback({ error: "Invalid input: roomIds must be an array." })
        return
      }

      // console.log(`[v0] Checking ${roomIds.length} rooms for ${socket.id}`)
      // console.log(`[v0] Current active rooms on server:`, Array.from(chatRooms.keys()))

      const activeRoomsData = roomIds
        .map((roomId) => {
          const room = chatRooms.get(roomId)
          console.log(`[v0] Room ${roomId}: ${room ? "exists" : "not found"}`)
          return room
        })
        .filter((room) => room !== undefined)
        .map((room) => ({
          roomId: room!.id,
          roomName: room!.name,
          isPrivate: room!.isPrivate,
          participantCount: room!.participants.size,
        }))

      // console.log(`[v0] Returning ${activeRoomsData.length} active rooms to ${socket.id}:`, activeRoomsData)

      if (callback) callback({ activeRooms: activeRoomsData })
    } catch (error) {
      console.error(`[v0] Error in checkActiveRooms for ${socket.id}:`, error)
      if (callback) callback({ error: "An internal server error occurred." })
    }
  })

  socket.on("requestJoinRoom", (data: { roomId: string; nickname: string; accessToken?: string; ghostId?: string }) => {
    try {
      console.log(`[v0] Join room request from ${socket.id}:`, {
        roomId: data.roomId,
        nickname: data.nickname,
        hasToken: !!data.accessToken,
        hasGhostId: !!data.ghostId,
      })

      const { roomId, nickname, accessToken, ghostId } = data
      const userSession = userSessions.get(socket.id)
      if (!userSession) {
        console.log(`[v0] Join room failed - no user session for ${socket.id}`)
        socket.emit("error", {
          message: "You must register before joining a room",
        })
        return
      }
      const sanitizedNickname = sanitizeInput(nickname || "Anonymous")
      if (!validateNickname(sanitizedNickname)) {
        socket.emit("error", { message: "Nickname must be 3-20 alphanumeric characters" })
        return
      }

      const room = chatRooms.get(roomId)
      if (!room) {
        console.log(`[v0] Join room failed - room ${roomId} not found`)
        socket.emit("error", { message: "Room not found" })
        return
      }
      console.log(`[v0] Room ${roomId} found, checking participant status for ${socket.id}`)
      console.log(`[v0] Current participants in room:`, Array.from(room.participants.keys()))
      console.log(`[v0] Current pending participants:`, Array.from(room.pendingParticipants.keys()))

      if (room.participants.has(socket.id)) {
        console.log(`[v0] User ${socket.id} is already in room ${roomId}`)
        socket.emit("error", { message: "You are already in this room" })
        return
      }
      if (room.pendingParticipants.has(socket.id)) {
        console.log(`[v0] User ${socket.id} already has pending request for room ${roomId}`)
        socket.emit("error", {
          message: "Your join request is already pending",
        })
        return
      }
      const isCreator = isOriginalRoomCreator(room, userSession.publicKey)
      let hasValidToken = false
      if (accessToken) {
        hasValidToken = room.accessTokens.has(accessToken)
        if (hasValidToken) {
          userSession.roomTokens.push(accessToken)
        }
      }
      let hasValidGhostId = false
      if (ghostId && !hasValidToken) {
        const masterSecret = config.MASTER_SECRET
        const result = validateGhostId(ghostId, masterSecret)
        if (result.isValid && result.walletAddress) {
          if (result.walletAddress === room.creatorPublicKey) {
            hasValidGhostId = true
            const token = generateRoomToken(roomId, userSession.publicKey)
            room.accessTokens.add(token)
            userSession.roomTokens.push(token)
          }
        }
      }
      if (room.isPrivate && !hasValidToken && !hasValidGhostId && !isCreator) {
        room.pendingParticipants.set(socket.id, {
          socketId: socket.id,
          publicKey: userSession.publicKey,
          nickname: sanitizedNickname,
          requestedAt: Date.now(),
        })
        socket.emit("joinRequestPending", {
          roomId: room.id,
          roomName: room.name,
        })
        if (room.creatorSocketId) {
          const creatorSocket = io.sockets.sockets.get(room.creatorSocketId)
          if (creatorSocket) {
            creatorSocket.emit("pendingJoinRequest", {
              roomId: room.id,
              pendingParticipants: getPendingParticipantsList(room),
            })
          }
        }
        console.log(`User ${sanitizedNickname} requested to join room ${room.name} (ID: ${roomId})`)
        return
      }
      if (isCreator) {
        console.log(`Original room creator ${sanitizedNickname} is rejoining room ${room.name} (ID: ${roomId})`)
        room.creatorSocketId = socket.id
      }
      joinRoomDirectly(socket, room, userSession, io, sanitizedNickname)
      console.log(`[v0] User ${sanitizedNickname} successfully processed join request for room ${roomId}`)
    } catch (error) {
      console.error(`[v0] Error in requestJoinRoom for ${socket.id}:`, error)
      socket.emit("error", {
        message: "Failed to request joining chat room",
      })
    }
  })

  socket.on("approveJoinRequest", (data: { roomId: string; participantId: string }) => {
    try {
      const { roomId, participantId } = data
      const userSession = userSessions.get(socket.id)
      if (!userSession) {
        socket.emit("error", { message: "You must be registered" })
        return
      }
      const room = chatRooms.get(roomId)
      if (!room) {
        socket.emit("error", { message: "Room not found" })
        return
      }
      if (!isRoomCreator(room, socket.id)) {
        socket.emit("error", {
          message: "Only the room creator can approve join requests",
        })
        return
      }
      const pendingParticipant = room.pendingParticipants.get(participantId)
      if (!pendingParticipant) {
        socket.emit("error", {
          message: "Participant not found in pending list",
        })
        return
      }
      const participantSocket = io.sockets.sockets.get(participantId)
      if (!participantSocket) {
        room.pendingParticipants.delete(participantId)
        socket.emit("pendingJoinRequest", {
          roomId: room.id,
          pendingParticipants: getPendingParticipantsList(room),
        })
        return
      }
      const participantSession = userSessions.get(participantId)
      if (!participantSession) {
        room.pendingParticipants.delete(participantId)
        socket.emit("pendingJoinRequest", {
          roomId: room.id,
          pendingParticipants: getPendingParticipantsList(room),
        })
        return
      }
      const token = generateRoomToken(roomId, participantSession.publicKey)
      room.accessTokens.add(token)
      participantSession.roomTokens.push(token)
      room.pendingParticipants.delete(participantId)
      room.participants.set(participantId, {
        socketId: participantId,
        publicKey: participantSession.publicKey,
        nickname: pendingParticipant.nickname,
        joinedAt: Date.now(),
      })
      socketToRoomMap.set(participantId, roomId)
      participantSocket.join(roomId)
      console.log(
        `User ${pendingParticipant.nickname} was approved to join room ${room.name} (ID: ${roomId}) by creator`,
      )
      participantSocket.emit("joinRequestApproved", {
        roomId: room.id,
        roomName: room.name,
        accessToken: token,
        participants: getParticipantsList(room),
        isCreator: false,
        pendingParticipants: [],
      })

      // Update: Emit the full updated participant list to all users in the room
      io.to(roomId).emit("userJoinedRoom", {
        roomId: room.id, // <-- Add this line
        nickname: pendingParticipant.nickname,
        participants: getParticipantsList(room),
      })

      socket.emit("pendingJoinRequest", {
        roomId: room.id,
        pendingParticipants: getPendingParticipantsList(room),
      })
    } catch (error) {
      console.error("Error in approveJoinRequest:", error)
      socket.emit("error", { message: "Failed to approve join request" })
    }
  })

  socket.on("rejectJoinRequest", (data: { roomId: string; participantId: string }) => {
    try {
      const { roomId, participantId } = data
      const userSession = userSessions.get(socket.id)
      if (!userSession) {
        socket.emit("error", { message: "You must be registered" })
        return
      }
      const room = chatRooms.get(roomId)
      if (!room) {
        socket.emit("error", { message: "Room not found" })
        return
      }
      if (!isRoomCreator(room, socket.id)) {
        socket.emit("error", {
          message: "Only the room creator can reject join requests",
        })
        return
      }
      const pendingParticipant = room.pendingParticipants.get(participantId)
      if (!pendingParticipant) {
        socket.emit("error", {
          message: "Participant not found in pending list",
        })
        return
      }
      room.pendingParticipants.delete(participantId)
      const participantSocket = io.sockets.sockets.get(participantId)
      if (participantSocket) {
        participantSocket.emit("joinRequestRejected", {
          roomId: room.id,
          roomName: room.name,
        })
      }
      socket.emit("pendingJoinRequest", {
        roomId: room.id,
        pendingParticipants: getPendingParticipantsList(room),
      })
    } catch (error) {
      console.error("Error in rejectJoinRequest:", error)
      socket.emit("error", { message: "Failed to reject join request" })
    }
  })

  socket.on("leaveRoom", (data: { roomId: string }) => {
    try {
      console.log(`[v0] Leave room request from ${socket.id}:`, data)

      const { roomId } = data
      const userSession = userSessions.get(socket.id)
      if (!userSession) {
        console.log(`[v0] Leave room failed - no user session for ${socket.id}`)
        socket.emit("error", {
          message: "You must be a registered user to leave a room",
        })
        return
      }

      const room = chatRooms.get(roomId)
      const participant = room?.participants.get(socket.id)

      console.log(`[v0] Leave room - room exists: ${!!room}, participant exists: ${!!participant}`)

      if (!room || !participant) {
        console.log(`[v0] Leave room failed - user ${socket.id} not in room ${roomId}`)
        socket.emit("error", { message: "You are not in this room" })
        return
      }

      room.participants.delete(socket.id)
      socket.leave(roomId)
      console.log(
        `[v0] User ${participant.nickname} left room ${room.name} (ID: ${roomId}), remaining: ${room.participants.size}`,
      )

      const userRoomIndex = userSession.roomTokens.findIndex((token) => token.startsWith(roomId))
      if (userRoomIndex !== -1) {
        userSession.roomTokens.splice(userRoomIndex, 1)
      }
      socketToRoomMap.delete(socket.id)

      io.to(roomId).emit("userLeftRoom", {
        roomId,
        nickname: participant.nickname,
        participants: getParticipantsList(room),
      })

      // MODIFIED: Only delete the room if it's empty AND private
      if (room.participants.size === 0 && room.isPrivate) {
        chatRooms.delete(roomId)
        console.log(`Private room ${room.name} (ID: ${roomId}) is now empty and has been deleted.`)
      } else if (room.participants.size === 0 && !room.isPrivate) {
        console.log(`Public room ${room.name} (ID: ${roomId}) is now empty and will persist.`)
      }

      socket.emit("roomLeft", { roomId })
      console.log(`[v0] Leave room completed for ${socket.id}`)
    } catch (error) {
      console.error(`[v0] Error in leaveRoom for ${socket.id}:`, error)
      socket.emit("error", { message: "Failed to leave room" })
    }
  })
}
