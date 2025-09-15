"use client";

import { io, type Socket } from "socket.io-client";
import { useEffect, useState } from "react";
import type { JsonWebKey } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { arrayBufferToBase64 } from "../utils/encryption";

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL;

// Define MAX_CHUNK_SIZE
const MAX_CHUNK_SIZE = 64 * 1024; // 64KB

// Create a singleton socket instance
let socket: Socket | null = null;
let isInitializing = false;

export const initializeSocket = (nest: string): Socket => {
  if (socket) return socket;

  if (isInitializing) {
    console.log("Socket already initializing, waiting...");
    // Return existing socket or create a new one if somehow we got here
    return (
      socket ||
      io(nest, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        autoConnect: true,
      })
    );
  }

  isInitializing = true;
  console.log("Initializing socket connection to", SOCKET_SERVER_URL);

  socket = io(SOCKET_SERVER_URL, {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    autoConnect: true,
  });

  // Register connection event handlers
  socket.on("connect", () => {
    // console.log("Connected to Socket.IO server");
    isInitializing = false;
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
    isInitializing = false;
  });

  socket.on("disconnect", (reason) => {
    console.log("Disconnected from Socket.IO server:", reason);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    isInitializing = false;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

// Register user without a nickname. The server will handle a generic nickname.
export const registerUser = (
  publicKey: string,
  nest: string,
): Promise<{
  success: boolean;
  ghostId?: string;
  error?: string;
}> => {
  return new Promise((resolve) => {
    const socket = getSocket() || initializeSocket(nest);

    const handleRegistered = (data: { ghostId?: string }) => {
      socket.off("userRegistered", handleRegistered);
      socket.off("error", handleError);
      resolve({
        success: true,
        ghostId: data.ghostId,
      });
    };

    const handleError = (error: { message: string }) => {
      socket.off("userRegistered", handleRegistered);
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("userRegistered", handleRegistered);
    socket.on("error", handleError);

    socket.emit("registerUser", { publicKey });
  });
};

// Create a chat room, now with a nickname parameter
export const createChatRoom = (
  roomName: string,
  nickname: string,
  isPrivate = false
): Promise<{
  success: boolean;
  roomData?: {
    roomId: string;
    roomName: string;
    accessToken: string;
    isPrivate: boolean;
    isCreator: boolean;
    participants: Array<{ nickname: string; joinedAt: number }>;
  };
  error?: string;
}> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" });
      return;
    }

    const handleRoomCreated = (data: {
      roomId: string;
      roomName: string;
      accessToken: string;
      isPrivate: boolean;
      isCreator: boolean;
      participants: Array<{ nickname: string; joinedAt: number }>;
    }) => {
      socket.off("roomCreated", handleRoomCreated);
      socket.off("error", handleError);
      resolve({ success: true, roomData: data });
    };

    const handleError = (error: { message: string }) => {
      socket.off("roomCreated", handleRoomCreated);
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("roomCreated", handleRoomCreated);
    socket.on("error", handleError);

    socket.emit("createChatRoom", { roomName, nickname, isPrivate });
  });
};

// Request to join a chat room, now with a nickname parameter
export const requestJoinRoom = (
  roomId: string,
  nickname: string,
  accessToken?: string,
  ghostId?: string
): Promise<{
  success: boolean;
  status: "joined" | "pending";
  roomData?: {
    roomId: string;
    roomName: string;
    isCreator: boolean;
    participants: Array<{ nickname: string; joinedAt: number }>;
    pendingParticipants?: Array<{
      id: string;
      nickname: string;
      requestedAt: number;
    }>;
  };
  error?: string;
}> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      resolve({
        success: false,
        status: "pending",
        error: "Socket not connected",
      });
      return;
    }

    // Handle immediate join
    const handleRoomJoined = (data: {
      roomId: string;
      roomName: string;
      isCreator: boolean;
      participants: Array<{ nickname: string; joinedAt: number }>;
      pendingParticipants?: Array<{
        id: string;
        nickname: string;
        requestedAt: number;
      }>;
    }) => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("joinRequestPending", handleJoinRequestPending);
      socket.off("error", handleError);
      resolve({ success: true, status: "joined", roomData: data });
    };

    // Handle pending join request
    const handleJoinRequestPending = (data: {
      roomId: string;
      roomName: string;
    }) => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("joinRequestPending", handleJoinRequestPending);
      socket.off("error", handleError);
      resolve({
        success: true,
        status: "pending",
        roomData: { roomId: data.roomId, roomName: data.roomName } as any,
      });
    };

    const handleError = (error: { message: string }) => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("joinRequestPending", handleJoinRequestPending);
      socket.off("error", handleError);
      resolve({ success: false, status: "pending", error: error.message });
    };

    socket.on("roomJoined", handleRoomJoined);
    socket.on("joinRequestPending", handleJoinRequestPending);
    socket.on("error", handleError);

    socket.emit("requestJoinRoom", { roomId, nickname, accessToken, ghostId });
  });
};

// Approve a join request (room creator only)
export const approveJoinRequest = (
  roomId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" });
      return;
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("error", handleError);

    socket.emit("approveJoinRequest", { roomId, participantId });

    // Assume success if no error within 500ms
    setTimeout(() => {
      socket.off("error", handleError);
      resolve({ success: true });
    }, 500);
  });
};

// Reject a join request (room creator only)
export const rejectJoinRequest = (
  roomId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" });
      return;
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("error", handleError);

    socket.emit("rejectJoinRequest", { roomId, participantId });

    // Assume success if no error within 500ms
    setTimeout(() => {
      socket.off("error", handleError);
      resolve({ success: true });
    }, 500);
  });
};

// Send a text message
export const sendMessage = (
  text: string,
  expiresAt?: number
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" });
      return;
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("error", handleError);

    socket.emit("sendMessage", { text, type: "text", expiresAt });

    // Assume success if no error within 500ms
    setTimeout(() => {
      socket.off("error", handleError);
      resolve({ success: true });
    }, 500);
  });
};

// Exchange public keys

export const sharePublicKey = (
  roomId: string,
  publicKeyJwk: globalThis.JsonWebKey
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      console.error("[SocketService] sharePublicKey: Aborted. Socket not connected.");
      resolve({ success: false, error: "Socket not connected" });
      return;
    }

    const handleError = (error: { message: string }) => {
      console.error(`[SocketService] sharePublicKey: Received 'error' event -> ${error.message}`);
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("error", handleError);

    // console.log(`[SocketService] Emitting 'sharePublicKey' for room: ${roomId}`);
    socket.emit("sharePublicKey", { roomId, publicKeyJwk });

    // This timeout assumes the operation is successful if no error is received.
    // It's a fire-and-forget approach on the client side.
    setTimeout(() => {
      // console.log("[SocketService] sharePublicKey: Resolved as success after 500ms timeout.");
      socket.off("error", handleError);
      resolve({ success: true });
    }, 500);
  });
};

// Send an encrypted message
// Send an encrypted message
export const sendEncryptedMessage = (
  encryptedMessages: Record<string, any>,
  expiresAt?: number,
  clientMessageId?: string // <-- Add clientMessageId here
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" });
      return;
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("error", handleError);

    socket.emit("sendEncryptedMessage", {
      encryptedMessages,
      expiresAt,
      senderId: socket.id,
      clientMessageId, // <-- Pass it in the payload
    });

    // Assume success if no error within 500ms
    setTimeout(() => {
      socket.off("error", handleError);
      resolve({ success: true });
    }, 500);
  });
};

// Send typing status
export const sendTypingStatus = (roomId: string, isTyping: boolean): void => {
  const socket = getSocket();
  if (!socket) return;

  if (isTyping) {
    socket.emit("userTyping", { roomId });
  } else {
    socket.emit("userStoppedTyping", { roomId });
  }
};

// Custom hook for using socket in components
export const useSocket = (nest: string): {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
} => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize socket if it doesn't exist
    const socket = getSocket() || initializeSocket(nest);
    setSocketInstance(socket);

    const onConnect = () => {
      // console.log("Socket connected in useSocket hook");
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log("Socket disconnected in useSocket hook");
      setIsConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Set initial connection state
    setIsConnected(socket.connected);

    // If not connected, try to connect
    if (!socket.connected) {
      console.log("Socket not connected, connecting...");
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const connect = () => {
    const socket = getSocket() || initializeSocket(nest);
    if (!socket.connected) {
      socket.connect();
    }
  };

  const disconnect = () => {
    disconnectSocket();
    setSocketInstance(null);
    setIsConnected(false);
  };

  return {
    socket: socketInstance,
    isConnected,
    connect,
    disconnect,
  };
};

// Validate a Ghost ID - simplified version that works reliably
export const validateGhostId = (
  ghostId: string,
  nest: string
): Promise<{
  success: boolean;
  isValid?: boolean;
  error?: string;
}> => {
  return new Promise((resolve) => {
    const socket = getSocket() || initializeSocket(nest);

    // Set up a one-time event listener for the validation result
    const handleValidationResult = (data: any) => {
      console.log("Received ghostIdValidationResult:", data);
      socket.off("ghostIdValidationResult", handleValidationResult);

      if (data && typeof data === "object") {
        resolve({
          success: true,
          isValid: data.isValid === true,
          error: data.error,
        });
      } else {
        resolve({
          success: false,
          error: "Invalid response format",
        });
      }
    };

    // Listen for the validation result
    socket.on("ghostIdValidationResult", handleValidationResult);

    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      socket.off("ghostIdValidationResult", handleValidationResult);
      resolve({
        success: false,
        error: "Validation timed out",
      });
    }, 5000);

    // Send the validation request
    console.log(
      "Emitting validateGhostId event with:",
      ghostId.substring(0, 8) + "..."
    );
    socket.emit("validateGhostId", { ghostId });

    // Also handle general errors
    const handleError = (error: { message: string }) => {
      clearTimeout(timeout);
      socket.off("ghostIdValidationResult", handleValidationResult);
      socket.off("error", handleError);

      resolve({
        success: false,
        error: error.message || "Error validating GhostID",
      });
    };

    socket.on("error", handleError);

    // Clean up the error handler after timeout
    setTimeout(() => {
      socket.off("error", handleError);
    }, 5500);
  });
};

// Generate a mock NFT
export const generateMockNft = (options: {
  name?: string;
  description?: string;
  collectionIndex?: number;
  attributes?: Array<{ trait_type: string; value: string }>;
}): Promise<{ success: boolean; nft?: any; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" });
      return;
    }

    const handleMockNftGenerated = (data: { nft: any }) => {
      socket.off("mockNftGenerated", handleMockNftGenerated);
      socket.off("error", handleError);
      resolve({ success: true, nft: data.nft });
    };

    const handleError = (error: { message: string }) => {
      socket.off("mockNftGenerated", handleMockNftGenerated);
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("mockNftGenerated", handleMockNftGenerated);
    socket.on("error", handleError);

    socket.emit("generateMockNft", options);
  });
};

// NEW: Function to delete a message
export const deleteMessage = (
  roomId: string,
  messageId: string
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" });
      return;
    }

    const handleError = (error: { message: string }) => {
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("error", handleError); // Send the deletion request to the server

    socket.emit("deleteMessage", { roomId, messageId }); // Assume success if no error is returned immediately

    setTimeout(() => {
      socket.off("error", handleError);
      resolve({ success: true });
    }, 500);
  });
};

export const leaveRoom = (
  roomId: string
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      resolve({ success: false, error: "Socket not connected" });
      return;
    }

    const handleRoomLeft = (data: { roomId: string }) => {
      socket.off("roomLeft", handleRoomLeft);
      socket.off("error", handleError);
      resolve({ success: true });
    };

    const handleError = (error: { message: string }) => {
      socket.off("roomLeft", handleRoomLeft);
      socket.off("error", handleError);
      resolve({ success: false, error: error.message });
    };

    socket.on("roomLeft", handleRoomLeft);
    socket.on("error", handleError);

    socket.emit("leaveRoom", { roomId });
  });
};

// NEW: Function to send a request for public key to all participants in the room
export const requestPublicKey = (roomId: string): void => {
  const socket = getSocket();
  if (!socket) return;
  socket.emit("requestPublicKey", { roomId });
};

export const sendFileChunks = async (
  messageId: string,
  encryptedData: ArrayBuffer,
  fileName: string,
  fileSize: number,
  allowDownload = true,
  iv?: Uint8Array,
  authTag?: Uint8Array,
  onProgress?: (progress: number) => void,
): Promise<{ success: boolean; error?: string }> => {
  const socket = getSocket();
  if (!socket) {
    return { success: false, error: "Socket not connected" };
  }

  const totalChunks = Math.ceil(encryptedData.byteLength / MAX_CHUNK_SIZE);

  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * MAX_CHUNK_SIZE;
      const end = start + MAX_CHUNK_SIZE;
      const chunk = encryptedData.slice(start, end);

      if(i <= 1) {
        console.log("[CLIENT] Sending chunk", {
          messageId,
          chunkIndex: i,
          size: chunk.byteLength,
          final: i === totalChunks - 1,
          hasIv: !!iv,
          hasAuthTag: !!authTag,
        })
  
        console.log(authTag)
        console.log()
      }

      socket.emit("sendFileChunk", {
        messageId,
        chunkIndex: i,
        chunk,
        final: i === totalChunks - 1,
        fileName,
        fileSize,
        allowDownload,
        totalChunks,
        // Include IV in the first chunk
        ...(i === 0 && iv && { iv: arrayBufferToBase64(iv.buffer) }),
        // Corrected: Convert authTag to a base64 string before sending
        ...(i === 0 && authTag && { authTag: arrayBufferToBase64(authTag.buffer) }),
      });

      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      // Add a small delay to prevent network congestion
      if (i < totalChunks - 1) {
        await new Promise((res) => setTimeout(res, 5));
      }
    }
    return { success: true };
  } catch (err) {
    console.error("Error sending file chunks:", err);
    return { success: false, error: (err as Error).message };
  }
};

export const checkActiveRooms = (roomIds: string[]): Promise<{ activeRooms?: any[]; error?: string }> => {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve({ error: "Socket not connected" });
      return;
    }

    // Use a timeout to prevent the app from waiting indefinitely
    socket.timeout(5000).emit("checkActiveRooms", { roomIds }, (err: any, response: { activeRooms?: any[]; error?: string; } | PromiseLike<{ activeRooms?: any[]; error?: string; }>) => {
      if (err) {
        // This fires if the server doesn't acknowledge the event in time
        resolve({ error: "Server did not respond in time." });
      } else {
        // The server responded, so we resolve with its payload
        resolve(response);
      }
    });
  });
};