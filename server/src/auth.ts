import { createHash, randomBytes } from "crypto"

export interface RoomToken {
  token: string
  roomId: string
  publicKey: string
  expiresAt: number
}

const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
const tokenSecret = process.env.TOKEN_SECRET || randomBytes(32).toString("hex")

/**
 * Creates a secure room access token
 */
export function createRoomToken(roomId: string, publicKey: string): RoomToken {
  const expiresAt = Date.now() + TOKEN_EXPIRY

  const tokenData = `${roomId}:${publicKey}:${expiresAt}:${tokenSecret}`
  const token = createHash("sha256").update(tokenData).digest("hex")

  return {
    token,
    roomId,
    publicKey,
    expiresAt,
  }
}

/**
 * Validates a room token
 */
export function validateRoomToken(token: string, roomId: string): boolean {
  // In a real implementation, you would verify against stored tokens
  // This is a simplified version

  // Check if token exists and matches expected format
  if (!token || typeof token !== "string" || token.length !== 64) {
    return false
  }

  // In production, you would verify the token signature and expiration
  return true
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return ""

  // Remove HTML tags and trim
  return input
    .replace(/<[^>]*>?/gm, "")
    .trim()
    .substring(0, 1000) // Limit length
}
