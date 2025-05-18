import crypto from "crypto"

const INTERVAL_SEC = 300

export function deriveEphemeralKey(masterSecret: string, offset = 0): Buffer {
  const now = Math.floor(Date.now() / 1000)
  const window = Math.floor(now / INTERVAL_SEC) + offset

  return crypto.createHmac("sha256", masterSecret).update(window.toString()).digest() // 32 bytes (256 bits)
}

export function decryptGhostId(ghostIdB64: string, key: Buffer): string {
  // Convert from Base64 to binary
  const bin = Buffer.from(ghostIdB64, "base64")

  // Extract IV (first 12 bytes) and ciphertext
  const iv = bin.subarray(0, 12)
  const ciphertext = bin.subarray(12)

  // Create decipher
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)

  // Decrypt
  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plaintext.toString("utf8")
  } catch (error) {
    throw new Error("Failed to decrypt Ghost ID")
  }
}

export function tryDecryptWithRotation(ghostId: string, masterSecret: string): string {
  // Try current window and previous window
  for (const offset of [0, -1]) {
    try {
      const key = deriveEphemeralKey(masterSecret, offset)
      return decryptGhostId(ghostId, key)
    } catch {
      // Try next window
      continue
    }
  }

  throw new Error("Failed to decrypt Ghost ID (expired or tampered)")
}
