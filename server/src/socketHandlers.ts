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

import { getGhostId, validateGhostId, tryDecryptWithRotation, deriveFileDataKey, encryptFileData, decryptFileData } from "./ghostIdManager"

const socketToWalletMap = new Map<string, string>()

interface StoredFile {
  encryptedData: Buffer | null
  iv: Buffer
  authTag: Buffer
  name: string
  size: number
  uploadedAt: number
  expiresAt: number
  cleanupTimer: NodeJS.Timeout | null
  originalFileId: string
}

interface ChatMessage {
  id: string
  sender: string
  text: string
  type: "text" | "file"
  timestamp: number
  expiresAt?: number
  encryptedFileId?: string
  fileName?: string
  fileSize?: number
}

const filesStorage = new Map<string, StoredFile>()

const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024
const FILE_EXPIRATION_DURATION_MS = 5 * 60 * 1000

const MASTER_SECRET = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

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

        socketToWalletMap.set(socket.id, publicKey)

        console.log(`User registered: ${sanitizedNickname} (Socket: ${socket.id})`)
        console.log(
          `[GhostID] Registering user with wallet: ${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`,
        )

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

        const masterSecret = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"
        const ghostId = getGhostId(publicKey, masterSecret)

        socket.emit("ghostIdUpdated", { ghostId })
        console.log(`[GhostID] Ghost ID sent to socket: ${socket.id}`)
      } catch (error) {
        console.error("Error in requestGhostId:", error)
        socket.emit("error", { message: "Failed to get Ghost ID" })
      }
    })

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

        const masterSecret = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"
        const ghostId = getGhostId(publicKey, masterSecret, true)

        socket.emit("ghostIdUpdated", { ghostId })
        console.log(`[GhostID] New Ghost ID sent after force refresh to socket: ${socket.id}`)
      } catch (error) {
        console.error("Error in forceRefreshGhostId:", error)
        socket.emit("error", { message: "Failed to refresh Ghost ID" })
      }
    })

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
          nickname: userSession.nickname,
          joinedAt: Date.now(),
        })

        chatRooms.set(roomId, newRoom)
        socketToRoomMap.set(socket.id, roomId)

        userSession.roomTokens.push(roomToken)

        socket.join(roomId)

        console.log(`Room created: ${sanitizedRoomName} (ID: ${roomId}) by ${userSession.nickname}`)

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

        if (room.participants.has(socket.id)) {
          socket.emit("error", { message: "You are already in this room" })
          return
        }

        if (room.pendingParticipants.has(socket.id)) {
          socket.emit("error", { message: "Your join request is already pending" })
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
          const masterSecret = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"
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
            nickname: userSession.nickname,
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

          console.log(`User ${userSession.nickname} requested to join room ${room.name} (ID: ${roomId})`)
          return
        }

        if (isCreator) {
          console.log(`Original room creator ${userSession.nickname} is rejoining room ${room.name} (ID: ${roomId})`)
          room.creatorSocketId = socket.id
        }

        joinRoomDirectly(socket, room, userSession, io)
      } catch (error) {
        console.error("Error in requestJoinRoom:", error)
        socket.emit("error", { message: "Failed to request joining chat room" })
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
          socket.emit("error", { message: "Only the room creator can approve join requests" })
          return
        }

        const pendingParticipant = room.pendingParticipants.get(participantId)
        if (!pendingParticipant) {
          socket.emit("error", { message: "Participant not found in pending list" })
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
          nickname: participantSession.nickname,
          joinedAt: Date.now(),
        })

        socketToRoomMap.set(participantId, roomId)
        participantSocket.join(roomId)

        console.log(
          `User ${participantSession.nickname} was approved to join room ${room.name} (ID: ${roomId}) by ${userSession.nickname}`,
        )

        participantSocket.emit("joinRequestApproved", {
          roomId: room.id,
          roomName: room.name,
          accessToken: token,
          participants: getParticipantsList(room),
          isCreator: false,
          pendingParticipants: [],
        })

        io.to(roomId).emit("userJoinedRoom", {
          roomId: room.id,
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
          socket.emit("error", { message: "Only the room creator can reject join requests" })
          return
        }

        const pendingParticipant = room.pendingParticipants.get(participantId)
        if (!pendingParticipant) {
          socket.emit("error", { message: "Participant not found in pending list" })
          return
        }

        room.pendingParticipants.delete(participantId)

        console.log(
          `Join request from ${pendingParticipant.nickname} was rejected for room ${room.name} (ID: ${roomId}) by ${userSession.nickname}`,
        )

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

        const message = {
          id: messageId,
          sender: userSession.nickname,
          text: sanitizedText,
          type,
          timestamp,
          expiresAt,
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

        pendingMessage.chunks.set(chunkIndex, chunk)
        pendingMessage.receivedChunks++

        const progress = Math.floor((pendingMessage.receivedChunks / pendingMessage.totalChunks) * 100)
        socket.emit("chunkProgress", { messageId, progress })

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

          const orderedChunks: Buffer[] = []
          for (let i = 0; i < pendingMessage.totalChunks; i++) {
            const chunk = pendingMessage.chunks.get(i)
            if (chunk) {
              orderedChunks.push(chunk)
            }
          }

          const completeData = Buffer.concat(orderedChunks)

          io.to(roomId).emit("largeMessage", {
            id: messageId,
            sender: userSession.nickname,
            data: completeData,
            timestamp: pendingMessage.timestamp,
          })

          pendingMessages.delete(messageId)
        }
      } catch (error) {
        console.error("Error in messageChunk:", error)
        socket.emit("error", { message: "Failed to process message chunk" })
      }
    })

    socket.on("sharePublicKey", (data: { roomId: string; publicKeyJwk: string }) => {
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

        socket.to(roomId).emit("publicKeyShared", {
          userId: socket.id,
          nickname: userSession.nickname,
          publicKeyJwk,
        })

        const participants = Array.from(room.participants.values())
        for (const participant of participants) {
          if (participant.socketId !== socket.id) {
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

    socket.on(
      "sendEncryptedMessage",
      (data: { encryptedMessages: Record<string, any>; expiresAt?: number; senderId?: string; fileAttachment?: { encryptedFileId: string; fileName: string; fileSize: number } }) => {
        try {
          const { encryptedMessages, expiresAt, fileAttachment } = data
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

          if (fileAttachment) {
            let originalFileId: string
            try {
              originalFileId = tryDecryptWithRotation(fileAttachment.encryptedFileId, MASTER_SECRET)
            } catch (e) {
              socket.emit("error", { message: "Invalid or malformed file Ghost ID in attachment." })
              return
            }

            if (!filesStorage.has(originalFileId)) {
              socket.emit("error", { message: `Attached file (Ghost ID: ${fileAttachment.encryptedFileId.substring(0,8)}...) not found or expired on server.` })
              return
            }
            console.log(`Validated attached file (Ghost ID: ${fileAttachment.encryptedFileId.substring(0,8)}...) for encrypted message.`)
          }

          for (const [recipientId, encryptedMessage] of Object.entries(encryptedMessages)) {
            const recipientSocket = io.sockets.sockets.get(recipientId)
            if (recipientSocket) {
              recipientSocket.emit("encryptedMessage", {
                id: messageId,
                sender: userSession.nickname,
                senderId: socket.id,
                encryptedContent: encryptedMessage,
                timestamp,
                expiresAt,
                fileAttachment: fileAttachment ? {
                  encryptedFileId: fileAttachment.encryptedFileId,
                  fileName: fileAttachment.fileName,
                  fileSize: fileAttachment.fileSize,
                } : undefined,
              })
            }
          }

          if (encryptedMessages[socket.id]) {
            socket.emit("encryptedMessage", {
              id: messageId,
              sender: userSession.nickname,
              senderId: socket.id,
              encryptedContent: encryptedMessages[socket.id],
              timestamp,
              expiresAt,
              fileAttachment: fileAttachment ? {
                encryptedFileId: fileAttachment.encryptedFileId,
                fileName: fileAttachment.fileName,
                fileSize: fileAttachment.fileSize,
              } : undefined,
            })
          }

          if (expiresAt) {
            const expirationTime = expiresAt - Date.now()
            if (expirationTime > 0) {
              setTimeout(async () => {
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

    socket.on("requestPublicKey", (data: { requesterId: string }) => {
      try {
        const { requesterId } = data

        const userSession = userSessions.get(socket.id)
        if (!userSession) {
          return
        }

        const requesterSocket = io.sockets.sockets.get(requesterId)
        if (requesterSocket) {
          socket.emit("publicKeyRequested", {
            requesterId,
          })
        }
      } catch (error) {
        console.error("Error in requestPublicKey:", error)
      }
    })

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

        socket.to(roomId).emit("userTypingStatus", {
          userId: socket.id,
          nickname: userSession.nickname,
          isTyping: false,
        })
      } catch (error) {
        console.error("Error in userStoppedTyping handler:", error)
      }
    })

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

              socket.to(roomId).emit("userLeftRoom", {
                nickname: participant.nickname,
                participants: getParticipantsList(room),
              })

              if (isRoomCreator(room, socket.id)) {
                const participants = Array.from(room.participants.values())
                if (participants.length > 0) {
                  participants.sort((a, b) => a.joinedAt - b.joinedAt)
                  const newCreator = participants[0]
                  room.creatorSocketId = newCreator.socketId
                  room.creatorPublicKey = newCreator.publicKey

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
                  chatRooms.delete(roomId)
                  console.log(`Room ${room.name} (ID: ${roomId}) is empty and has been removed.`)
                }
              }
            }

            if (room.pendingParticipants.has(socket.id)) {
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
          }
          socketToRoomMap.delete(socket.id)
        }

        userSessions.delete(socket.id)

        socketToWalletMap.delete(socket.id)

        for (const [messageId, message] of pendingMessages.entries()) {
          if (message.senderId === socket.id) {
            pendingMessages.delete(messageId)
          }
        }
      } catch (error) {
        console.error("Error in disconnect handler:", error)
      }
    })

    socket.on("error", (error: Error) => {
      console.error(`Socket error for ${socket.id}:`, error.message)
    })

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

        const masterSecret = process.env.MASTER_SECRET || "ANOGHOST_MASTER_SECRET_DEMO_ONLY"
        const result = validateGhostId(ghostId, masterSecret)

        if (result.isValid && result.walletAddress) {
          console.log(`[GhostID] Validation successful for Ghost ID: ${ghostId.substring(0, 8)}...`)
          socket.emit("ghostIdValidationResult", {
            success: true,
            isValid: true,
            walletPreview: `${result.walletAddress.substring(0, 4)}...${result.walletAddress.substring(result.walletAddress.length - 4)}`,
          })
        } else {
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

function joinRoomDirectly(socket: Socket, room: ChatRoom, userSession: UserSession, io: SocketIOServer) {
  const currentRoomId = socketToRoomMap.get(socket.id)
  if (currentRoomId) {
    const currentRoom = chatRooms.get(currentRoomId)
    if (currentRoom) {
      currentRoom.participants.delete(socket.id)
      socket.leave(currentRoomId)

      socket.to(currentRoomId).emit("userLeftRoom", {
        nickname: userSession.nickname,
        participants: getParticipantsList(currentRoom),
      })
    }
    socketToRoomMap.delete(socket.id)
  }

  room.participants.set(socket.id, {
    socketId: socket.id,
    publicKey: userSession.publicKey,
    nickname: userSession.nickname,
    joinedAt: Date.now(),
  })

  socketToRoomMap.set(socket.id, room.id)
  socket.join(room.id)

  const isCreator = isRoomCreator(room, socket.id) || isOriginalRoomCreator(room, userSession.publicKey)

  console.log(`User ${userSession.nickname} joined room ${room.name} (ID: ${room.id}), isCreator: ${isCreator}`)

  socket.emit("roomJoined", {
    roomId: room.id,
    roomName: room.name,
    isCreator: isCreator,
    participants: getParticipantsList(room),
    pendingParticipants: isCreator ? getPendingParticipantsList(room) : [],
  })

  socket.to(room.id).emit("userJoinedRoom", {
    nickname: userSession.nickname,
    participants: getParticipantsList(room),
  })
}

function isOriginalRoomCreator(room: ChatRoom, publicKey: string): boolean {
  return room.creatorPublicKey === publicKey
}