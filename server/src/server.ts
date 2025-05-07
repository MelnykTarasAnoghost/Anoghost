import http from "http"
import { Server as SocketIOServer, type Socket } from "socket.io"
import express, { type Express, type Request, type Response } from "express"
import { randomUUID } from "crypto"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import cors from "cors"
import { createHash } from "crypto"

const PORT = process.env.PORT || 3001
const MAX_MESSAGE_SIZE = 10 * 1024 * 1024 // 10MB max message size
const MAX_CHUNK_SIZE = 64 * 1024 // 64KB chunks for large data

const app: Express = express()

// Security middleware
app.use(helmet()) // Set security headers
app.use(express.json({ limit: "1mb" })) // Limit JSON body size
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"],
  }),
)

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
})
app.use("/api", apiLimiter)

const httpServer = http.createServer(app)

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: MAX_MESSAGE_SIZE, // Allow large messages
})

// --- Data Structures ---
interface UserSession {
  socketId: string
  publicKey: string
  nickname: string
  roomTokens: string[] // Tokens for rooms this user can access
}

interface ChatRoomParticipant {
  socketId: string
  publicKey: string // Stored but never shared with other clients
  nickname: string
  joinedAt: number
}

interface PendingParticipant {
  socketId: string
  publicKey: string
  nickname: string
  requestedAt: number
}

interface ChatRoom {
  id: string
  name: string
  createdAt: number
  creatorPublicKey: string // Stored but never shared
  creatorSocketId: string // Socket ID of the room creator
  participants: Map<string, ChatRoomParticipant> // socketId -> participant
  pendingParticipants: Map<string, PendingParticipant> // socketId -> pending participant
  accessTokens: Set<string> // Valid access tokens for this room
  isPrivate: boolean // Whether the room requires approval to join
}

interface MessageChunk {
  id: string
  chunks: Map<number, Buffer>
  totalChunks: number
  receivedChunks: number
  senderId: string
  timestamp: number
}

// Maps socketId to user session
const userSessions = new Map<string, UserSession>()

// Maps roomId to room data
const chatRooms = new Map<string, ChatRoom>()

// Maps socketId to roomId
const socketToRoomMap = new Map<string, string>()

// Maps messageId to message chunks for large messages
const pendingMessages = new Map<string, MessageChunk>()

// --- Helper Functions ---
function sanitizeInput(input: string): string {
  // Basic sanitization - remove HTML tags and trim
  return input.replace(/<[^>]*>?/gm, "").trim()
}

function validateNickname(nickname: string): boolean {
  // Nickname should be 3-20 alphanumeric chars, spaces, or common symbols
  return /^[a-zA-Z0-9_\-\s]{3,20}$/.test(nickname)
}

function generateRoomToken(roomId: string, publicKey: string): string {
  // Create a token that grants access to a specific room
  const token = createHash("sha256")
    .update(`${roomId}:${publicKey}:${process.env.TOKEN_SECRET || "default-secret"}:${Date.now()}`)
    .digest("hex")

  return token
}

function getParticipantsList(room: ChatRoom): Array<{ nickname: string; joinedAt: number }> {
  // Return only nickname and join time, not public keys
  return Array.from(room.participants.values()).map((p) => ({
    nickname: p.nickname,
    joinedAt: p.joinedAt,
  }))
}

function getPendingParticipantsList(room: ChatRoom): Array<{ id: string; nickname: string; requestedAt: number }> {
  // Return pending participants with their socket IDs (for approval/rejection)
  return Array.from(room.pendingParticipants.entries()).map(([socketId, p]) => ({
    id: socketId,
    nickname: p.nickname,
    requestedAt: p.requestedAt,
  }))
}

function isRoomCreator(room: ChatRoom, socketId: string): boolean {
  return room.creatorSocketId === socketId
}

// --- Socket.IO Event Handlers ---
io.on("connection", (socket: Socket) => {
  console.log(`New client connected: ${socket.id}`)

  // Register user with public key and nickname
  socket.on("registerUser", (data: { publicKey: string; nickname: string }) => {
    try {
      const { publicKey, nickname } = data

      // Validate inputs
      if (!publicKey || typeof publicKey !== "string" || publicKey.length < 10) {
        socket.emit("error", { message: "Invalid public key format" })
        return
      }

      const sanitizedNickname = sanitizeInput(nickname || "Anonymous")
      if (!validateNickname(sanitizedNickname)) {
        socket.emit("error", { message: "Nickname must be 3-20 alphanumeric characters" })
        return
      }

      // Create user session
      userSessions.set(socket.id, {
        socketId: socket.id,
        publicKey,
        nickname: sanitizedNickname,
        roomTokens: [],
      })

      console.log(`User registered: ${sanitizedNickname} (Socket: ${socket.id})`)
      socket.emit("userRegistered", { nickname: sanitizedNickname })
    } catch (error) {
      console.error("Error in registerUser:", error)
      socket.emit("error", { message: "Failed to register user" })
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
  socket.on("requestJoinRoom", (data: { roomId: string; accessToken?: string }) => {
    try {
      const { roomId, accessToken } = data

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

      // Verify access token if provided
      let hasValidToken = false
      if (accessToken) {
        hasValidToken = room.accessTokens.has(accessToken)
        if (hasValidToken) {
          userSession.roomTokens.push(accessToken)
        }
      }

      // If room is private and user doesn't have a valid token, add to pending
      if (room.isPrivate && !hasValidToken) {
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

      // If room is not private or user has a valid token, join immediately
      joinRoomDirectly(socket, room, userSession)
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

  // Join a room directly (internal function)
  function joinRoomDirectly(socket: Socket, room: ChatRoom, userSession: UserSession) {
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

    console.log(`User ${userSession.nickname} joined room ${room.name} (ID: ${room.id})`)

    // Notify the user they've joined
    socket.emit("roomJoined", {
      roomId: room.id,
      roomName: room.name,
      isCreator: isRoomCreator(room, socket.id),
      participants: getParticipantsList(room),
      pendingParticipants: isRoomCreator(room, socket.id) ? getPendingParticipantsList(room) : [],
    })

    // Notify others in the room
    socket.to(room.id).emit("userJoinedRoom", {
      nickname: userSession.nickname,
      participants: getParticipantsList(room),
    })
  }

  // Send a message to the room
  socket.on("sendMessage", (data: { text: string; type?: string }) => {
    try {
      const { text, type = "text" } = data

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
      }

      // Send to everyone in the room including sender
      io.to(roomId).emit("message", message)
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
})

// --- REST API Routes ---
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" })
})

// Start the server
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`)
  console.log(`   WebSocket connections enabled.`)
  console.log(`   Security measures implemented.`)
})

// Graceful shutdown
const signals = ["SIGTERM", "SIGINT"] as const
signals.forEach((signal) => {
  process.on(signal, () => {
    console.log(`${signal} signal received: closing HTTP server`)
    io.close(() => {
      console.log("Socket.IO server closed")
    })
    httpServer.close(() => {
      console.log("HTTP server closed")
      process.exit(0)
    })
  })
})
