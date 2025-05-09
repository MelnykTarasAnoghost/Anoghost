"use client"

import { io, type Socket } from "socket.io-client"
import { useEffect, useState } from "react"

// The URL of your Socket.IO server
const SOCKET_SERVER_URL = "http://localhost:3001"

// Create a singleton socket instance
let socket: Socket | null = null

// For large file transfers
const MAX_CHUNK_SIZE = 64 * 1024 // 64KB chunks

export const initializeSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    })

    // Register connection event handlers
    socket.on("connect", () => {
      console.log("Connected to Socket.IO server")
    })

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error)
    })

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from Socket.IO server:", reason)
    })
  }

  return socket
}

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const getSocket = (): Socket | null => {
  return socket
}

// Register user with nickname
export const registerUser = (
  publicKey: string,
  nickname: string,
): Promise<{ success: boolean; nickname?: string; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket() || initializeSocket()

    const handleRegistered = (data: { nickname: string }) => {
      socket.off("userRegistered", handleRegistered)
      socket.off("error", handleError)
      resolve({ success: true, nickname: data.nickname })
    }

    const handleError = (error: { message: string }) => {
      socket.off("userRegistered", handleRegistered)
      socket.off("error", handleError)
      resolve({ success: false, error: error.message })
    }

    socket.on("userRegistered", handleRegistered)
    socket.on("error", handleError)

    socket.emit("registerUser", { publicKey, nickname })
  })
}

// Create a chat room
export const createChatRoom = (
  roomName: string,
  isPrivate = false,
): Promise<{
  success: boolean
  roomData?: {
    roomId: string
    roomName: string
    accessToken: string
    isPrivate: boolean
    isCreator: boolean
    participants: Array<{ nickname: string; joinedAt: number }>
  }
  error?: string
}> => {
  return new Promise((resolve) => {
    const socket = getSocket()
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" })
      return
    }

    const handleRoomCreated = (data: {
      roomId: string
      roomName: string
      accessToken: string
      isPrivate: boolean
      isCreator: boolean
      participants: Array<{ nickname: string; joinedAt: number }>
    }) => {
      socket.off("roomCreated", handleRoomCreated)
      socket.off("error", handleError)
      resolve({ success: true, roomData: data })
    }

    const handleError = (error: { message: string }) => {
      socket.off("roomCreated", handleRoomCreated)
      socket.off("error", handleError)
      resolve({ success: false, error: error.message })
    }

    socket.on("roomCreated", handleRoomCreated)
    socket.on("error", handleError)

    socket.emit("createChatRoom", { roomName, isPrivate })
  })
}

// Request to join a chat room
export const requestJoinRoom = (
  roomId: string,
  accessToken?: string,
): Promise<{
  success: boolean
  status: "joined" | "pending"
  roomData?: {
    roomId: string
    roomName: string
    isCreator: boolean
    participants: Array<{ nickname: string; joinedAt: number }>
    pendingParticipants?: Array<{ id: string; nickname: string; requestedAt: number }>
  }
  error?: string
}> => {
  return new Promise((resolve) => {
    const socket = getSocket()
    if (!socket) {
      resolve({ success: false, status: "pending", error: "Socket not connected" })
      return
    }

    // Handle immediate join
    const handleRoomJoined = (data: {
      roomId: string
      roomName: string
      isCreator: boolean
      participants: Array<{ nickname: string; joinedAt: number }>
      pendingParticipants?: Array<{ id: string; nickname: string; requestedAt: number }>
    }) => {
      socket.off("roomJoined", handleRoomJoined)
      socket.off("joinRequestPending", handleJoinRequestPending)
      socket.off("error", handleError)
      resolve({ success: true, status: "joined", roomData: data })
    }

    // Handle pending join request
    const handleJoinRequestPending = (data: { roomId: string; roomName: string }) => {
      socket.off("roomJoined", handleRoomJoined)
      socket.off("joinRequestPending", handleJoinRequestPending)
      socket.off("error", handleError)
      resolve({ success: true, status: "pending", roomData: { roomId: data.roomId, roomName: data.roomName } as any })
    }

    const handleError = (error: { message: string }) => {
      socket.off("roomJoined", handleRoomJoined)
      socket.off("joinRequestPending", handleJoinRequestPending)
      socket.off("error", handleError)
      resolve({ success: false, status: "pending", error: error.message })
    }

    socket.on("roomJoined", handleRoomJoined)
    socket.on("joinRequestPending", handleJoinRequestPending)
    socket.on("error", handleError)

    socket.emit("requestJoinRoom", { roomId, accessToken })
  })
}

// Approve a join request (room creator only)
export const approveJoinRequest = (
  roomId: string,
  participantId: string,
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket()
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" })
      return
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError)
      resolve({ success: false, error: error.message })
    }

    socket.on("error", handleError)

    socket.emit("approveJoinRequest", { roomId, participantId })

    // Assume success if no error within 500ms
    setTimeout(() => {
      socket.off("error", handleError)
      resolve({ success: true })
    }, 500)
  })
}

// Reject a join request (room creator only)
export const rejectJoinRequest = (
  roomId: string,
  participantId: string,
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket()
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" })
      return
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError)
      resolve({ success: false, error: error.message })
    }

    socket.on("error", handleError)

    socket.emit("rejectJoinRequest", { roomId, participantId })

    // Assume success if no error within 500ms
    setTimeout(() => {
      socket.off("error", handleError)
      resolve({ success: true })
    }, 500)
  })
}

// Send a text message
export const sendMessage = (text: string, expiresAt?: number): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket()
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" })
      return
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError)
      resolve({ success: false, error: error.message })
    }

    socket.on("error", handleError)

    socket.emit("sendMessage", { text, type: "text", expiresAt })

    // Assume success if no error within 500ms
    setTimeout(() => {
      socket.off("error", handleError)
      resolve({ success: true })
    }, 500)
  })
}

// Send a large file or data
export const sendLargeData = async (
  data: ArrayBuffer | Blob,
  type: string,
  onProgress?: (progress: number) => void,
): Promise<{ success: boolean; error?: string }> => {
  return new Promise(async (resolve) => {
    const socket = getSocket()
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" })
      return
    }

    try {
      // Convert to ArrayBuffer if it's a Blob
      const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data

      // Calculate total chunks
      const totalChunks = Math.ceil(arrayBuffer.byteLength / MAX_CHUNK_SIZE)

      // Initialize large message
      let messageId: string | null = null

      const handleInitialized = (data: { messageId: string; type: string }) => {
        messageId = data.messageId
        sendChunks()
      }

      const handleProgress = (data: { messageId: string; progress: number }) => {
        if (data.messageId === messageId && onProgress) {
          onProgress(data.progress)
        }
      }

      const handleError = (error: { message: string }) => {
        cleanup()
        resolve({ success: false, error: error.message })
      }

      const cleanup = () => {
        socket.off("largeMessageInitialized", handleInitialized)
        socket.off("chunkProgress", handleProgress)
        socket.off("error", handleError)
      }

      socket.on("largeMessageInitialized", handleInitialized)
      socket.on("chunkProgress", handleProgress)
      socket.on("error", handleError)

      // Start the large message process
      socket.emit("startLargeMessage", { totalChunks, type })

      // Function to send chunks after initialization
      const sendChunks = async () => {
        if (!messageId) {
          cleanup()
          resolve({ success: false, error: "Failed to initialize large message" })
          return
        }

        try {
          // Send each chunk
          for (let i = 0; i < totalChunks; i++) {
            const start = i * MAX_CHUNK_SIZE
            const end = Math.min(start + MAX_CHUNK_SIZE, arrayBuffer.byteLength)
            const chunk = arrayBuffer.slice(start, end)

            // Convert to Buffer-like for socket.io
            const chunkBuffer = new Uint8Array(chunk)

            // Send the chunk
            socket.emit("messageChunk", {
              messageId,
              chunkIndex: i,
              chunk: chunkBuffer,
              final: i === totalChunks - 1,
            })

            // Small delay to prevent overwhelming the connection
            if (i < totalChunks - 1) {
              await new Promise((r) => setTimeout(r, 10))
            }
          }

          cleanup()
          resolve({ success: true })
        } catch (err) {
          cleanup()
          resolve({ success: false, error: "Error sending chunks: " + (err as Error).message })
        }
      }
    } catch (err) {
      resolve({ success: false, error: "Error preparing data: " + (err as Error).message })
    }
  })
}

// Exchange public keys
export const sharePublicKey = (
  roomId: string,
  publicKeyJwk: JsonWebKey,
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket()
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" })
      return
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError)
      resolve({ success: false, error: error.message })
    }

    socket.on("error", handleError)

    socket.emit("sharePublicKey", { roomId, publicKeyJwk })

    // Assume success if no error within 500ms
    setTimeout(() => {
      socket.off("error", handleError)
      resolve({ success: true })
    }, 500)
  })
}

// Send an encrypted message
export const sendEncryptedMessage = (
  encryptedMessages: Record<string, any>,
  expiresAt?: number,
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket()
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" })
      return
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError)
      resolve({ success: false, error: error.message })
    }

    socket.on("error", handleError)

    // Explicitly include the sender's socket ID
    socket.emit("sendEncryptedMessage", {
      encryptedMessages,
      expiresAt,
      senderId: socket.id, // Explicitly include sender ID
    })

    // Assume success if no error within 500ms
    setTimeout(() => {
      socket.off("error", handleError)
      resolve({ success: true })
    }, 500)
  })
}

// Send typing status
export const sendTypingStatus = (roomId: string, isTyping: boolean): void => {
  const socket = getSocket()
  if (!socket) return

  if (isTyping) {
    socket.emit("userTyping", { roomId })
  } else {
    socket.emit("userStoppedTyping", { roomId })
  }
}

// Custom hook for using socket in components
export const useSocket = (): {
  socket: Socket | null
  isConnected: boolean
  connect: () => void
  disconnect: () => void
} => {
  const [isConnected, setIsConnected] = useState(false)
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null)

  const connect = () => {
    const socket = initializeSocket()
    setSocketInstance(socket)
  }

  const disconnect = () => {
    disconnectSocket()
    setSocketInstance(null)
  }

  useEffect(() => {
    const socket = getSocket()
    if (socket) {
      setSocketInstance(socket)

      const onConnect = () => setIsConnected(true)
      const onDisconnect = () => setIsConnected(false)

      socket.on("connect", onConnect)
      socket.on("disconnect", onDisconnect)

      // Set initial connection state
      setIsConnected(socket.connected)

      return () => {
        socket.off("connect", onConnect)
        socket.off("disconnect", onDisconnect)
      }
    }
  }, [])

  return { socket: socketInstance, isConnected, connect, disconnect }
}

// Add this function to the file

// Generate a mock NFT
export const generateMockNft = (options?: {
  name?: string
  description?: string
  collectionIndex?: number
  attributes?: Array<{ trait_type: string; value: string }>
}): Promise<{ success: boolean; nft?: any; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket()
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" })
      return
    }

    const handleNftGenerated = (data: { nft: any }) => {
      socket.off("mockNftGenerated", handleNftGenerated)
      socket.off("error", handleError)
      resolve({ success: true, nft: data.nft })
    }

    const handleError = (error: { message: string }) => {
      socket.off("mockNftGenerated", handleNftGenerated)
      socket.off("error", handleError)
      resolve({ success: false, error: error.message })
    }

    socket.on("mockNftGenerated", handleNftGenerated)
    socket.on("error", handleError)

    socket.emit("generateMockNft", options || {})
  })
}
