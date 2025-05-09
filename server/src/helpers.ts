import { createHash } from "crypto"
import type { ChatRoom } from "./types"

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  // Basic sanitization - remove HTML tags and trim
  return input.replace(/<[^>]*>?/gm, "").trim()
}

/**
 * Validates nickname format
 */
export function validateNickname(nickname: string): boolean {
  // Nickname should be 3-20 alphanumeric chars, spaces, or common symbols
  return /^[a-zA-Z0-9_\-\s]{3,20}$/.test(nickname)
}

/**
 * Generates a secure room access token
 */
export function generateRoomToken(roomId: string, publicKey: string): string {
  // Create a token that grants access to a specific room
  const token = createHash("sha256")
    .update(`${roomId}:${publicKey}:${process.env.TOKEN_SECRET || "default-secret"}:${Date.now()}`)
    .digest("hex")

  return token
}

/**
 * Returns a list of participants without sensitive data
 */
export function getParticipantsList(room: ChatRoom): Array<{ nickname: string; joinedAt: number }> {
  // Return only nickname and join time, not public keys
  return Array.from(room.participants.values()).map((p) => ({
    nickname: p.nickname,
    joinedAt: p.joinedAt,
  }))
}

/**
 * Returns a list of pending participants for approval
 */
export function getPendingParticipantsList(
  room: ChatRoom,
): Array<{ id: string; nickname: string; requestedAt: number }> {
  // Return pending participants with their socket IDs (for approval/rejection)
  return Array.from(room.pendingParticipants.entries()).map(([socketId, p]) => ({
    id: socketId,
    nickname: p.nickname,
    requestedAt: p.requestedAt,
  }))
}

/**
 * Checks if a socket is the room creator
 */
export function isRoomCreator(room: ChatRoom, socketId: string): boolean {
  return room.creatorSocketId === socketId
}
