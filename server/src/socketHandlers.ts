import type { Server as SocketIOServer, Socket } from "socket.io"
import { randomUUID } from "crypto"
import {
  userSessions,
  chatRooms,
  socketToRoomMap,
  pendingMessages,
  type UserSession,
  type ChatRoom,
  MAX_CHUNK_SIZE,
} from "./types"
import {
  sanitizeInput,
  validateNickname,
  generateRoomToken,
  getParticipantsList,
  getPendingParticipantsList,
  isRoomCreator,
} from "./helpers"

import { getGhostId, validateGhostId } from "./ghostIdManager"

const socketToWalletMap = new Map<string, string>()

export function setupSocketHandlers(io: SocketIOServer) {
  io.on("connection", (socket: Socket) => {
    console.log(`New client connected: ${socket.id}`)
    socket.on("registerUser", (data: { publicKey: string; nickname: string }) => {
      try {
        const { publicKey, nickname } = data

        if (!publicKey || typeof publicKey !== "string" || publicKey.length < 10) {
          socket.emit("error", { message: "Invalid public key format" })
          return
        }

        const sanitizedNickname = sanitizeInput(nickname || "Anonymous")
        if (!validateNickname(sanitizedNickname)) {
          socket.emit("error", { message: "Nickname must be 3-20 alphanumeric characters" })
          return
        }
        userSessions.set(socket.id, {
          socketId: socket.id,
          publicKey,
          nickname: sanitizedNickname,
          roomTokens: [],
        })

        // Store wallet address for this socket
        socketToWalletMap.set(socket.id, publicKey)

        console.log(`User registered: ${sanitizedNickname} (Socket: ${socket.id})`)
        console.log(
          `[GhostID] Registering user with wallet: ${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`,
        )

        // Generate Ghost ID for this user
        const masterSecret = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"
        console.log(
          `[GhostID] Using master secret: ${masterSecret.substring(0, 3)}...${masterSecret.substring(masterSecret.length - 3)}`,
        )
        const ghostId = getGhostId(publicKey, masterSecret)

        socket.emit("userRegistered", {
          nickname: sanitizedNickname,
          ghostId,
        })

        console.log(`[GhostID] Ghost ID sent to user: ${sanitizedNickname}`)
      } catch (error) {
        console.error("Error in registerUser:", error)
        socket.emit("error", { message: "Failed to register user" })
      }
    })

    // Request Ghost ID refresh
    socket.on("requestGhostId", () => {
      try {
        const publicKey = socketToWalletMap.get(socket.id)
        if (!publicKey) {
          console.error(`[GhostID] Request failed: No wallet found for socket ${socket.id}`)
          socket.emit("error", { message: "You must register before requesting a Ghost ID" })
          return
        }

        console.log(
          `[GhostID] Ghost ID requested for wallet: ${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`,
        )

        // Generate or retrieve Ghost ID
        const masterSecret = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"
        const ghostId = getGhostId(publicKey, masterSecret)

        socket.emit("ghostIdUpdated", { ghostId })
        console.log(`[GhostID] Ghost ID sent to socket: ${socket.id}`)
      } catch (error) {
        console.error("Error in requestGhostId:", error)
        socket.emit("error", { message: "Failed to get Ghost ID" })
      }
    })

    // Force refresh Ghost ID
    socket.on("forceRefreshGhostId", () => {
      try {
        const publicKey = socketToWalletMap.get(socket.id)
        if (!publicKey) {
          console.error(`[GhostID] Force refresh failed: No wallet found for socket ${socket.id}`)
          socket.emit("error", { message: "You must register before refreshing a Ghost ID" })
          return
        }

        console.log(
          `[GhostID] Force refresh requested for wallet: ${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`,
        )

        // Force generate a new Ghost ID
        const masterSecret = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"
        const ghostId = getGhostId(publicKey, masterSecret, true)

        socket.emit("ghostIdUpdated", { ghostId })
        console.log(`[GhostID] New Ghost ID sent after force refresh to socket: ${socket.id}`)
      } catch (error) {
        console.error("Error in forceRefreshGhostId:", error)
        socket.emit("error", { message: "Failed to refresh Ghost ID" })
      }
    })

    // Create a new chat room
    socket.on("createChatRoom", (data: { roomName: string; isPrivate: boolean }) => {
      try {
        const userSession = userSessions.get(socket.id)
        if (!userSession) {
          socket.emit("error", { message: "You must register before creating a room" })
          return
        }

        const { roomName, isPrivate = false } = data
        const sanitizedRoomName = sanitizeInput(roomName || "Unnamed Room")

        if (!sanitizedRoomName || sanitizedRoomName.length < 3 || sanitizedRoomName.length > 30) {
          socket.emit("error", { message: "Room name must be 3-30 characters" })
          return
        }

        const roomId = randomUUID()
        const roomToken = generateRoomToken(roomId, userSession.publicKey)

        // Create the room
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

        // Add creator as first participant
        newRoom.participants.set(socket.id, {
          socketId: socket.id,
          publicKey: userSession.publicKey,
          nickname: userSession.nickname,
          joinedAt: Date.now(),
        })

        // Store the room and update mappings
        chatRooms.set(roomId, newRoom)
        socketToRoomMap.set(socket.id, roomId)

        // Add token to user's session
        userSession.roomTokens.push(roomToken)

        // Join the socket.io room
        socket.join(roomId)

        console.log(`Room created: ${sanitizedRoomName} (ID: ${roomId}) by ${userSession.nickname}`)

        // Send room info back to creator (without public keys)
        socket.emit("roomCreated", {
          roomId: newRoom.id,
          roomName: newRoom.name,
          accessToken: roomToken,
          isPrivate: newRoom.isPrivate,
          isCreator: true,
          participants: getParticipantsList(newRoom),
        })
      } catch (error) {
        console.error("Error in createChatRoom:", error)
        socket.emit("error", { message: "Failed to create chat room" })
      }
    })

    // Request to join a chat room
    socket.on("requestJoinRoom", (data: { roomId: string; accessToken?: string; ghostId?: string }) => {
      try {
        const { roomId, accessToken, ghostId } = data

        const userSession = userSessions.get(socket.id)
        if (!userSession) {
          socket.emit("error", { message: "You must register before joining a room" })
          return
        }

        const room = chatRooms.get(roomId)
        if (!room) {
          socket.emit("error", { message: "Room not found" })
          return
        }

        // Check if user is already in the room
        if (room.participants.has(socket.id)) {
          socket.emit("error", { message: "You are already in this room" })
          return
        }

        // Check if user is already pending
        if (room.pendingParticipants.has(socket.id)) {
          socket.emit("error", { message: "Your join request is already pending" })
          return
        }

        // Check if this user is the original room creator (by public key)
        const isCreator = isOriginalRoomCreator(room, userSession.publicKey)

        // Verify access token if provided
        let hasValidToken = false
        if (accessToken) {
          hasValidToken = room.accessTokens.has(accessToken)
          if (hasValidToken) {
            userSession.roomTokens.push(accessToken)
          }
        }

        // Verify Ghost ID if provided
        let hasValidGhostId = false
        if (ghostId && !hasValidToken) {
          const masterSecret = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"
          const result = validateGhostId(ghostId, masterSecret)

          if (result.isValid && result.walletAddress) {
            // Check if the Ghost ID belongs to the room creator
            if (result.walletAddress === room.creatorPublicKey) {
              hasValidGhostId = true

              // Generate a token for this user
              const token = generateRoomToken(roomId, userSession.publicKey)
              room.accessTokens.add(token)
              userSession.roomTokens.push(token)
            }
          }
        }

        // If room is private and user doesn't have a valid token or Ghost ID and is not the creator, add to pending
        if (room.isPrivate && !hasValidToken && !hasValidGhostId && !isCreator) {
          // Add user to pending participants
          room.pendingParticipants.set(socket.id, {
            socketId: socket.id,
            publicKey: userSession.publicKey,
            nickname: userSession.nickname,
            requestedAt: Date.now(),
          })

          // Notify the user their request is pending
          socket.emit("joinRequestPending", {
            roomId: room.id,
            roomName: room.name,
          })

          // Notify room creator about the pending request
          if (room.creatorSocketId) {
            const creatorSocket = io.sockets.sockets.get(room.creatorSocketId)
            if (creatorSocket) {
              creatorSocket.emit("pendingJoinRequest", {
                roomId: room.id,
                pendingParticipants: getPendingParticipantsList(room),
              })
            }
          }

          console.log(`User ${userSession.nickname} requested to join room ${room.name} (ID: ${roomId})`)
          return
        }

        // If user is the original creator, update the creator socket ID
        if (isCreator) {
          console.log(`Original room creator ${userSession.nickname} is rejoining room ${room.name} (ID: ${roomId})`)
          room.creatorSocketId = socket.id
        }

        // If room is not private or user has a valid token or Ghost ID or is the creator, join immediately
        joinRoomDirectly(socket, room, userSession, io)
      } catch (error) {
        console.error("Error in requestJoinRoom:", error)
        socket.emit("error", { message: "Failed to request joining chat room" })
      }
    })

    // Approve a join request (room creator only)
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

        // Check if user is the room creator
        if (!isRoomCreator(room, socket.id)) {
          socket.emit("error", { message: "Only the room creator can approve join requests" })
          return
        }

        // Check if the participant is in pending list
        const pendingParticipant = room.pendingParticipants.get(participantId)
        if (!pendingParticipant) {
          socket.emit("error", { message: "Participant not found in pending list" })
          return
        }

        // Get the participant's socket
        const participantSocket = io.sockets.sockets.get(participantId)
        if (!participantSocket) {
          // Participant disconnected, remove from pending
          room.pendingParticipants.delete(participantId)
          socket.emit("pendingJoinRequest", {
            roomId: room.id,
            pendingParticipants: getPendingParticipantsList(room),
          })
          return
        }

        // Get the participant's session
        const participantSession = userSessions.get(participantId)
        if (!participantSession) {
          // Participant session not found, remove from pending
          room.pendingParticipants.delete(participantId)
          socket.emit("pendingJoinRequest", {
            roomId: room.id,
            pendingParticipants: getPendingParticipantsList(room),
          })
          return
        }

        // Generate a token for the participant
        const token = generateRoomToken(roomId, participantSession.publicKey)
        room.accessTokens.add(token)
        participantSession.roomTokens.push(token)

        // Remove from pending list
        room.pendingParticipants.delete(participantId)

        // Add to participants
        room.participants.set(participantId, {
          socketId: participantId,
          publicKey: participantSession.publicKey,
          nickname: participantSession.nickname,
          joinedAt: Date.now(),
        })

        // Update socket to room mapping
        socketToRoomMap.set(participantId, roomId)

        // Join the socket.io room
        participantSocket.join(roomId)

        console.log(
          `User ${participantSession.nickname} was approved to join room ${room.name} (ID: ${roomId}) by ${userSession.nickname}`,
        )

        // Notify the participant they've been approved
        participantSocket.emit("joinRequestApproved", {
          roomId: room.id,
          roomName: room.name,
          accessToken: token,
          participants: getParticipantsList(room),
        })

        // Notify all participants about the new user
        socket.to(roomId).emit("userJoinedRoom", {
          nickname: participantSession.nickname,
          participants: getParticipantsList(room),
        })

        // Update the room creator's pending list
        socket.emit("pendingJoinRequest", {
          roomId: room.id,
          pendingParticipants: getPendingParticipantsList(room),
        })
      } catch (error) {
        console.error("Error in approveJoinRequest:", error)
        socket.emit("error", { message: "Failed to approve join request" })
      }
    })

    // Reject a join request (room creator only)
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

        // Check if user is the room creator
        if (!isRoomCreator(room, socket.id)) {
          socket.emit("error", { message: "Only the room creator can reject join requests" })
          return
        }

        // Check if the participant is in pending list
        const pendingParticipant = room.pendingParticipants.get(participantId)
        if (!pendingParticipant) {
          socket.emit("error", { message: "Participant not found in pending list" })
          return
        }

        // Remove from pending list
        room.pendingParticipants.delete(participantId)

        console.log(
          `Join request from ${pendingParticipant.nickname} was rejected for room ${room.name} (ID: ${roomId}) by ${userSession.nickname}`,
        )

        // Notify the participant they've been rejected
        const participantSocket = io.sockets.sockets.get(participantId)
        if (participantSocket) {
          participantSocket.emit("joinRequestRejected", {
            roomId: room.id,
            roomName: room.name,
          })
        }

        // Update the room creator's pending list
        socket.emit("pendingJoinRequest", {
          roomId: room.id,
          pendingParticipants: getPendingParticipantsList(room),
        })
      } catch (error) {
        console.error("Error in rejectJoinRequest:", error)
        socket.emit("error", { message: "Failed to reject join request" })
      }
    })

    // Send a message to the room
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

        const sanitizedText = sanitizeInput(text)
        if (!sanitizedText) {
          socket.emit("error", { message: "Message cannot be empty" })
          return
        }

        const messageId = randomUUID()
        const timestamp = Date.now()

        // Create message object (without public key)
        const message = {
          id: messageId,
          sender: userSession.nickname,
          text: sanitizedText,
          type,
          timestamp,
          expiresAt, // Include the expiration timestamp
        }

        // Send to everyone in the room including sender
        io.to(roomId).emit("message", message)

        // If message has an expiration, set up automatic deletion
        if (expiresAt) {
          const expirationTime = expiresAt - Date.now()
          if (expirationTime > 0) {
            // Schedule message expiration
            setTimeout(() => {
              // Notify all room participants that the message has expired
              io.to(roomId).emit("messageExpired", { messageId })
            }, expirationTime)
          }
        }
      } catch (error) {
        console.error("Error in sendMessage:", error)
        socket.emit("error", { message: "Failed to send message" })
      }
    })

    // Handle large data messages in chunks
    socket.on("startLargeMessage", (data: { totalChunks: number; type: string }) => {
      try {
        const { totalChunks, type } = data

        const userSession = userSessions.get(socket.id)
        if (!userSession) {
          socket.emit("error", { message: "You must register before sending data" })
          return
        }

        const roomId = socketToRoomMap.get(socket.id)
        if (!roomId) {
          socket.emit("error", { message: "You must join a room before sending data" })
          return
        }

        if (totalChunks <= 0 || totalChunks > 1000) {
          socket.emit("error", { message: "Invalid chunk count" })
          return
        }

        const messageId = randomUUID()

        // Initialize message chunks tracking
        pendingMessages.set(messageId, {
          id: messageId,
          chunks: new Map(),
          totalChunks,
          receivedChunks: 0,
          senderId: socket.id,
          timestamp: Date.now(),
        })

        socket.emit("largeMessageInitialized", { messageId, type })
      } catch (error) {
        console.error("Error in startLargeMessage:", error)
        socket.emit("error", { message: "Failed to initialize large message" })
      }
    })

    socket.on("messageChunk", (data: { messageId: string; chunkIndex: number; chunk: Buffer; final: boolean }) => {
      try {
        const { messageId, chunkIndex, chunk, final } = data

        const pendingMessage = pendingMessages.get(messageId)
        if (!pendingMessage) {
          socket.emit("error", { message: "Invalid message ID" })
          return
        }

        if (pendingMessage.senderId !== socket.id) {
          socket.emit("error", { message: "You are not the sender of this message" })
          return
        }

        if (chunkIndex < 0 || chunkIndex >= pendingMessage.totalChunks) {
          socket.emit("error", { message: "Invalid chunk index" })
          return
        }

        if (!Buffer.isBuffer(chunk) || chunk.length > MAX_CHUNK_SIZE) {
          socket.emit("error", { message: "Invalid chunk data" })
          return
        }

        // Store the chunk
        pendingMessage.chunks.set(chunkIndex, chunk)
        pendingMessage.receivedChunks++

        // Update progress
        const progress = Math.floor((pendingMessage.receivedChunks / pendingMessage.totalChunks) * 100)
        socket.emit("chunkProgress", { messageId, progress })

        // If all chunks received or this is marked as final, process the message
        if (final || pendingMessage.receivedChunks === pendingMessage.totalChunks) {
          const roomId = socketToRoomMap.get(socket.id)
          if (!roomId) {
            pendingMessages.delete(messageId)
            return
          }

          const userSession = userSessions.get(socket.id)
          if (!userSession) {
            pendingMessages.delete(messageId)
            return
          }

          // Combine all chunks in order
          const orderedChunks: Buffer[] = []
          for (let i = 0; i < pendingMessage.totalChunks; i++) {
            const chunk = pendingMessage.chunks.get(i)
            if (chunk) {
              orderedChunks.push(chunk)
            }
          }

          const completeData = Buffer.concat(orderedChunks)

          // Send the complete message to all room participants
          io.to(roomId).emit("largeMessage", {
            id: messageId,
            sender: userSession.nickname,
            data: completeData,
            timestamp: pendingMessage.timestamp,
          })

          // Clean up
          pendingMessages.delete(messageId)
        }
      } catch (error) {
        console.error("Error in messageChunk:", error)
        socket.emit("error", { message: "Failed to process message chunk" })
      }
    })

    // Add these new socket event handlers for key exchange

    // Handle public key sharing
    socket.on("sharePublicKey", (data: { roomId: string; publicKeyJwk: JsonWebKey }) => {
      try {
        const { roomId, publicKeyJwk } = data

        const userSession = userSessions.get(socket.id)
        if (!userSession) {
          socket.emit("error", { message: "You must register before sharing keys" })
          return
        }

        const room = chatRooms.get(roomId)
        if (!room) {
          socket.emit("error", { message: "Room not found" })
          return
        }

        // Broadcast the public key to all room participants
        socket.to(roomId).emit("publicKeyShared", {
          userId: socket.id,
          nickname: userSession.nickname,
          publicKeyJwk,
        })

        // Send all existing public keys to the new participant
        const participants = Array.from(room.participants.values())
        for (const participant of participants) {
          if (participant.socketId !== socket.id) {
            // Request public key from each participant
            const participantSocket = io.sockets.sockets.get(participant.socketId)
            if (participantSocket) {
              participantSocket.emit("requestPublicKey", {
                requesterId: socket.id,
                requesterNickname: userSession.nickname,
              })
            }
          }
        }
      } catch (error) {
        console.error("Error in sharePublicKey:", error)
        socket.emit("error", { message: "Failed to share public key" })
      }
    })

    // Handle encrypted messages
    socket.on(
      "sendEncryptedMessage",
      (data: { encryptedMessages: Record<string, any>; expiresAt?: number; senderId?: string }) => {
        try {
          const { encryptedMessages, expiresAt } = data
          // Use the provided sender ID or fall back to the socket ID
          const senderId = data.senderId || socket.id

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

          const messageId = randomUUID()
          const timestamp = Date.now()

          // For each recipient, send their encrypted version of the message
          for (const [recipientId, encryptedMessage] of Object.entries(encryptedMessages)) {
            const recipientSocket = io.sockets.sockets.get(recipientId)
            if (recipientSocket) {
              recipientSocket.emit("encryptedMessage", {
                id: messageId,
                sender: userSession.nickname,
                senderId: socket.id, // Always use the actual socket ID of the sender
                encryptedContent: encryptedMessage,
                timestamp,
                expiresAt, // Include the expiration timestamp
              })
            }
          }

          // Also send to the sender (their own encrypted version)
          if (encryptedMessages[socket.id]) {
            socket.emit("encryptedMessage", {
              id: messageId,
              sender: userSession.nickname,
              senderId: socket.id, // Always use the actual socket ID of the sender
              encryptedContent: encryptedMessages[socket.id],
              timestamp,
              expiresAt, // Include the expiration timestamp
            })
          }

          // If message has an expiration, set up automatic deletion
          if (expiresAt) {
            const expirationTime = expiresAt - Date.now()
            if (expirationTime > 0) {
              // Schedule message expiration
              setTimeout(async () => {
                // Notify all recipients that the message has expired
                for (const recipientId of Object.keys(encryptedMessages)) {
                  const recipientSocket = io.sockets.sockets.get(recipientId)
                  if (recipientSocket) {
                    recipientSocket.emit("messageExpired", { messageId })
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

    // Handle public key requests
    socket.on("requestPublicKey", (data: { requesterId: string }) => {
      try {
        const { requesterId } = data

        const userSession = userSessions.get(socket.id)
        if (!userSession) {
          return
        }

        // Get the requester's socket
        const requesterSocket = io.sockets.sockets.get(requesterId)
        if (requesterSocket) {
          // The client will need to respond to this event by sharing their public key
          socket.emit("publicKeyRequested", {
            requesterId,
          })
        }
      } catch (error) {
        console.error("Error in requestPublicKey:", error)
      }
    })

    // Handle typing status
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

        // Broadcast to all other users in the room that this user is typing
        socket.to(roomId).emit("userTypingStatus", {
          userId: socket.id,
          nickname: userSession.nickname,
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

        // Broadcast to all other users in the room that this user stopped typing
        socket.to(roomId).emit("userTypingStatus", {
          userId: socket.id,
          nickname: userSession.nickname,
          isTyping: false,
        })
      } catch (error) {
        console.error("Error in userStoppedTyping handler:", error)
      }
    })

    // Handle disconnection
    socket.on("disconnect", (reason: string) => {
      try {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`)

        const roomId = socketToRoomMap.get(socket.id)
        if (roomId) {
          const room = chatRooms.get(roomId)
          if (room) {
            const participant = room.participants.get(socket.id)
            if (participant) {
              room.participants.delete(socket.id)

              // Notify others in the room
              socket.to(roomId).emit("userLeftRoom", {
                nickname: participant.nickname,
                participants: getParticipantsList(room),
              })

              // If this was the room creator, assign a new creator or close the room
              if (isRoomCreator(room, socket.id)) {
                // Get the oldest participant to be the new creator
                const participants = Array.from(room.participants.values())
                if (participants.length > 0) {
                  // Sort by join time and pick the oldest
                  participants.sort((a, b) => a.joinedAt - b.joinedAt)
                  const newCreator = participants[0]
                  room.creatorSocketId = newCreator.socketId
                  room.creatorPublicKey = newCreator.publicKey

                  // Notify the new creator
                  const newCreatorSocket = io.sockets.sockets.get(newCreator.socketId)
                  if (newCreatorSocket) {
                    newCreatorSocket.emit("roomCreatorChanged", {
                      roomId: room.id,
                      isCreator: true,
                      pendingParticipants: getPendingParticipantsList(room),
                    })
                  }

                  // Notify all participants about the change
                  io.to(roomId).emit("message", {
                    id: randomUUID(),
                    sender: "system",
                    text: `${newCreator.nickname} is now the room admin.`,
                    timestamp: Date.now(),
                  })
                } else {
                  // No participants left, clean up the room
                  chatRooms.delete(roomId)
                  console.log(`Room ${room.name} (ID: ${roomId}) is empty and has been removed.`)
                }
              }
            }

            // Also check if user was in pending participants
            if (room.pendingParticipants.has(socket.id)) {
              room.pendingParticipants.delete(socket.id)

              // Notify room creator about updated pending list
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
          }
          socketToRoomMap.delete(socket.id)
        }

        // Clean up user session
        userSessions.delete(socket.id)

        // Remove from wallet map
        socketToWalletMap.delete(socket.id)

        // Clean up any pending large messages from this user
        for (const [messageId, message] of pendingMessages.entries()) {
          if (message.senderId === socket.id) {
            pendingMessages.delete(messageId)
          }
        }
      } catch (error) {
        console.error("Error in disconnect handler:", error)
      }
    })

    // Handle errors
    socket.on("error", (error: Error) => {
      console.error(`Socket error for ${socket.id}:`, error.message)
    })

    // Add this to the setupSocketHandlers function, inside the io.on("connection", (socket: Socket) => { ... }) block
    // socket.on(
    //   "generateMockNft",
    //   (data: {
    //     name?: string
    //     description?: string
    //     collectionIndex?: number
    //     attributes?: Array<{ trait_type: string; value: string }>
    //   }) => {
    //     try {
    //       const userSession = userSessions.get(socket.id)
    //       if (!userSession) {
    //         socket.emit("error", { message: "You must register before generating NFTs" })
    //         return
    //       }

    //       // Generate a mock NFT
    //       const nft = generateMockNft(userSession.publicKey, data)

    //       // Return the generated NFT
    //       socket.emit("mockNftGenerated", { nft })

    //       console.log(`Mock NFT generated for ${userSession.nickname}: ${nft.name} (${nft.mint})`)
    //     } catch (error) {
    //       console.error("Error generating mock NFT:", error)
    //       socket.emit("error", { message: "Failed to generate mock NFT" })
    //     }
    //   },
    // )

    // Validate Ghost ID
    socket.on("validateGhostId", async (data: { ghostId: string }) => {
      try {
        const { ghostId } = data

        if (!ghostId || typeof ghostId !== "string") {
          console.error(`[GhostID] Validation failed: Invalid Ghost ID format`)
          socket.emit("ghostIdValidationResult", {
            success: false,
            error: "Invalid Ghost ID format",
          })
          return
        }

        console.log(`[GhostID] Validation requested for Ghost ID: ${ghostId.substring(0, 8)}...`)

        // Attempt to decrypt and validate the Ghost ID
        const masterSecret = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"
        const result = validateGhostId(ghostId, masterSecret)

        if (result.isValid && result.walletAddress) {
          // Success - emit the result without the actual wallet address for security
          console.log(`[GhostID] Validation successful for Ghost ID: ${ghostId.substring(0, 8)}...`)
          socket.emit("ghostIdValidationResult", {
            success: true,
            isValid: true,
            // Only send a truncated version
            walletPreview: `${result.walletAddress.substring(0, 4)}...${result.walletAddress.substring(result.walletAddress.length - 4)}`,
          })
        } else {
          // Failed to decrypt
          console.error(`[GhostID] Validation failed: ${result.error}`)
          socket.emit("ghostIdValidationResult", {
            success: false,
            isValid: false,
            error: result.error || "Invalid or expired Ghost ID",
          })
        }
      } catch (error) {
        console.error("Error validating Ghost ID:", error)
        socket.emit("ghostIdValidationResult", {
          success: false,
          error: "Failed to validate Ghost ID",
        })
      }
    })
  })
}

// Join a room directly (internal function)
function joinRoomDirectly(socket: Socket, room: ChatRoom, userSession: UserSession, io: SocketIOServer) {
  // Leave current room if in one
  const currentRoomId = socketToRoomMap.get(socket.id)
  if (currentRoomId) {
    const currentRoom = chatRooms.get(currentRoomId)
    if (currentRoom) {
      currentRoom.participants.delete(socket.id)
      socket.leave(currentRoomId)

      // Notify others in the room
      socket.to(currentRoomId).emit("userLeftRoom", {
        nickname: userSession.nickname,
        participants: getParticipantsList(currentRoom),
      })
    }
    socketToRoomMap.delete(socket.id)
  }

  // Join the new room
  room.participants.set(socket.id, {
    socketId: socket.id,
    publicKey: userSession.publicKey,
    nickname: userSession.nickname,
    joinedAt: Date.now(),
  })

  socketToRoomMap.set(socket.id, room.id)
  socket.join(room.id)

  // Check if this user is the room creator (either by socket ID or public key)
  const isCreator = isRoomCreator(room, socket.id) || isOriginalRoomCreator(room, userSession.publicKey)

  console.log(`User ${userSession.nickname} joined room ${room.name} (ID: ${room.id}), isCreator: ${isCreator}`)

  // Notify the user they've joined
  socket.emit("roomJoined", {
    roomId: room.id,
    roomName: room.name,
    isCreator: isCreator,
    participants: getParticipantsList(room),
    pendingParticipants: isCreator ? getPendingParticipantsList(room) : [],
  })

  // Notify others in the room
  socket.to(room.id).emit("userJoinedRoom", {
    nickname: userSession.nickname,
    participants: getParticipantsList(room),
  })
}

function isOriginalRoomCreator(room: ChatRoom, publicKey: string): boolean {
  return room.creatorPublicKey === publicKey
}
