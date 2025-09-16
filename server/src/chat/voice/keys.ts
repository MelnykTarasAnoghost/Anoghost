// src/chat/voice/keys.ts

import type { Server as SocketIOServer, Socket } from "socket.io";
import { userSessions, socketToRoomMap } from "../types";

/**
 * Sets up handlers for the secure exchange of E2EE keys for voice chat.
 */
export function setupKeysHandlers(socket: Socket, io: SocketIOServer) {

  // MOVED FROM messages.ts: A user shares their public key with the room
  socket.on("keys:sharePublicKey", (data: { publicKeyJwk: any }) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId || !userSessions.has(socket.id)) return;
    
    // Broadcast the public key to all OTHER clients in the room for E2EE setup
    socket.to(roomId).emit("keys:publicKeyShared", {
      socketId: socket.id,
      publicKeyJwk: data.publicKeyJwk,
    });
  });

  // MOVED FROM messages.ts: A new user requests existing public keys
  socket.on("keys:requestPublicKeys", () => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId || !userSessions.has(socket.id)) return;

    // Ask all other clients in the room to re-share their keys for the new user
    socket.to(roomId).emit("keys:publicKeyRequested", {
      requesterId: socket.id
    });
  });

  // The room creator/initiator distributes the generated symmetric room key,
  // individually encrypted for each participant.
  socket.on("keys:shareRoomVoiceKey", (data: { encryptedKeys: Record<string, string> }) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId || !userSessions.has(socket.id)) return;

    // The payload is a map of { socketId: encryptedKeyBlob }
    for (const [recipientId, encryptedKey] of Object.entries(data.encryptedKeys)) {
      // Send each user their individually encrypted version of the key
      io.to(recipientId).emit("keys:roomVoiceKeyReceived", {
        from: socket.id,
        encryptedKey: encryptedKey
      });
    }
  });
}