import { createHash } from "crypto";
import type { ChatRoom, UserSession } from "../chat/types";
import { Server as SocketIOServer, Socket } from "socket.io";
import { chatRooms, socketToRoomMap, userSessions } from "../chat/types";
import { config } from "../config";

/**
 * Sanitizes user input to prevent XSS attacks.
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input.replace(/<[^>]*>?/gm, "").trim().substring(0, 1000);
}

/**
 * Validates nickname format.
 */
export function validateNickname(nickname: string): boolean {
  return /^[a-zA-Z0-9_\-\s]{3,20}$/.test(nickname);
}

/**
 * Generates a secure room access token.
 */
export function generateRoomToken(roomId: string, publicKey: string): string {
  const token = createHash("sha256")
    .update(`${roomId}:${publicKey}:${config.TOKEN_SECRET || "default-secret"}:${Date.now()}`)
    .digest("hex");
  return token;
}

/**
 * Returns a list of participants without sensitive data.
 */
export function getParticipantsList(room: ChatRoom): Array<{ nickname: string; joinedAt: number }> {
  return Array.from(room.participants.values()).map((p) => ({
    nickname: p.nickname,
    joinedAt: p.joinedAt,
  }));
}

/**
 * Returns a list of pending participants for approval.
 */
export function getPendingParticipantsList(
  room: ChatRoom,
): Array<{ id: string; nickname: string; requestedAt: number }> {
  return Array.from(room.pendingParticipants.entries()).map(([socketId, p]) => ({
    id: socketId,
    nickname: p.nickname,
    requestedAt: p.requestedAt,
  }));
}

/**
 * Checks if a socket is the room creator.
 */
export function isRoomCreator(room: ChatRoom, socketId: string): boolean {
  return room.creatorSocketId === socketId;
}

/**
 * Checks if a user's public key matches the original room creator's key.
 */
export function isOriginalRoomCreator(room: ChatRoom, publicKey: string): boolean {
  return room.creatorPublicKey === publicKey;
}

/**
 * Manages the process of a user joining a room directly.
 */
export function joinRoomDirectly(socket: Socket, room: ChatRoom, userSession: UserSession, io: SocketIOServer, nickname: string) {
  const currentRoomId = socketToRoomMap.get(socket.id);
  if (currentRoomId) {
    const currentRoom = chatRooms.get(currentRoomId);
    if (currentRoom) {
      currentRoom.participants.delete(socket.id);
      socket.leave(currentRoomId);
      
      // Update: Send the updated participants list to the old room
      io.to(currentRoomId).emit("userLeftRoom", {
        roomId: currentRoomId,
        nickname: nickname,
        participants: getParticipantsList(currentRoom),
      });
    }
    socketToRoomMap.delete(socket.id);
  }

  room.participants.set(socket.id, {
    socketId: socket.id,
    publicKey: userSession.publicKey,
    nickname: nickname,
    joinedAt: Date.now(),
  });

  socketToRoomMap.set(socket.id, room.id);
  socket.join(room.id);

  const isCreator = isRoomCreator(room, socket.id) || isOriginalRoomCreator(room, userSession.publicKey);

  console.log(`User ${nickname} joined room ${room.name} (ID: ${room.id}), isCreator: ${isCreator}`);

  // Emit to the user who just joined
  socket.emit("roomJoined", {
    roomId: room.id,
    roomName: room.name,
    isCreator: isCreator,
    participants: getParticipantsList(room),
    pendingParticipants: isCreator ? getPendingParticipantsList(room) : [],
  });

  // Update: Emit the full updated participant list to all other users in the room
  socket.to(room.id).emit("userJoinedRoom", {
    roomId: room.id,
    roomName: room.name,
    nickname: nickname,
    participants: getParticipantsList(room), // Include the new participant list here
  });
}