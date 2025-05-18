import crypto from "crypto"

// Time window in seconds (5 minutes)
const INTERVAL_SEC = 300

// Map to store active Ghost IDs by wallet address
const activeGhostIds = new Map<string, string>()

// Map to store the last generation time for each wallet
const lastGenerationTime = new Map<string, number>()

/**
 * Derives an ephemeral key from the master secret and current time window
 * @param masterSecret The master secret
 * @param offset Time window offset (0 for current, -1 for previous)
 * @returns Buffer containing the derived key
 */
function deriveEphemeralKey(masterSecret: string, offset = 0): Buffer {
  const now = Math.floor(Date.now() / 1000)
  const window = Math.floor(now / INTERVAL_SEC) + offset
  return crypto.createHmac("sha256", masterSecret).update(window.toString()).digest() // 32 bytes
}

/**
 * Encrypts a wallet address into a Ghost ID
 * @param walletAddress The wallet address to encrypt
 * @param key The encryption key
 * @returns Base64 encoded Ghost ID (IV + ciphertext)
 */
function encryptWalletToGhostId(walletAddress: string, key: Buffer): string {
  // Generate a random IV (96 bits as recommended for GCM)
  const iv = crypto.randomBytes(12)

  // Create cipher
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

  // Encrypt the wallet address
  const encrypted = Buffer.concat([cipher.update(walletAddress, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Combine IV + ciphertext + authTag for storage/transmission
  const combined = Buffer.concat([iv, encrypted, authTag])

  // Convert to Base64
  return combined.toString("base64")
}

/**
 * Decrypts a Ghost ID to retrieve the wallet address
 * @param ghostId Base64 encoded Ghost ID
 * @param key The decryption key
 * @returns The original wallet address
 */
function decryptGhostId(ghostId: string, key: Buffer): string {
  try {
    const combined = Buffer.from(ghostId, "base64")

    // Extract IV (first 12 bytes)
    const iv = combined.subarray(0, 12)

    // Extract auth tag (last 16 bytes)
    const authTag = combined.subarray(combined.length - 16)

    // Extract ciphertext (everything in between)
    const ciphertext = combined.subarray(12, combined.length - 16)

    // Create decipher
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)

    // Decrypt
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString("utf8")
  } catch (error) {
    throw new Error("Failed to decrypt Ghost ID")
  }
}

// Add logging to tryDecryptWithRotation function
export function tryDecryptWithRotation(ghostId: string, masterSecret: string): string {
  for (const offset of [0, -1]) {
    try {
      const key = deriveEphemeralKey(masterSecret, offset)
      const result = decryptGhostId(ghostId, key)
      return result
    } catch {
      continue // try next window
    }
  }
  throw new Error("Ghost doesn't exist")
}

// Add logging to getGhostId function
export function getGhostId(walletAddress: string, masterSecret: string, forceRefresh = false): string {
  const now = Date.now()
  const lastGen = lastGenerationTime.get(walletAddress) || 0
  const timeElapsed = now - lastGen

  // Check if we need to generate a new Ghost ID
  // Generate if:
  // 1. We don't have one for this wallet
  // 2. Force refresh is requested
  // 3. It's been more than 5 minutes since the last generation
  if (!activeGhostIds.has(walletAddress) || forceRefresh || timeElapsed > INTERVAL_SEC * 1000) {
    // Generate a new Ghost ID
    const key = deriveEphemeralKey(masterSecret)
    const ghostId = encryptWalletToGhostId(walletAddress, key)

    // Store it
    activeGhostIds.set(walletAddress, ghostId)
    lastGenerationTime.set(walletAddress, now)

    return ghostId
  }

  // Return the existing Ghost ID
  const existingGhostId = activeGhostIds.get(walletAddress)!
  return existingGhostId
}

/**
 * Formats a Ghost ID for display (truncates and adds separators)
 * @param ghostId The full Ghost ID
 * @returns Formatted Ghost ID for display
 */
export function formatGhostId(ghostId: string): string {
  if (!ghostId || ghostId.length < 12) return ghostId

  // Take first 12 chars and format with separators
  const prefix = ghostId.substring(0, 12)
  return `${prefix.substring(0, 4)}-${prefix.substring(4, 8)}-${prefix.substring(8, 12)}`
}

// Add logging to validateGhostId function
export function validateGhostId(
  ghostId: string,
  masterSecret: string,
): {
  isValid: boolean
  walletAddress?: string
  error?: string
} {
  try {
    const walletAddress = tryDecryptWithRotation(ghostId, masterSecret)
    return {
      isValid: true,
      walletAddress,
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error validating Ghost ID",
    }
  }
}

// Add logging to scheduleGhostIdRotation function
export function scheduleGhostIdRotation(masterSecret: string): NodeJS.Timeout {
  return setInterval(() => {
    const now = Math.floor(Date.now() / 1000)
    const currentWindow = Math.floor(now / INTERVAL_SEC)
    const secondsUntilNextWindow = (currentWindow + 1) * INTERVAL_SEC - now

    // If we're close to the window boundary (within 10 seconds), rotate all Ghost IDs
    if (secondsUntilNextWindow <= 10) {
      // Get all wallet addresses
      const walletAddresses = Array.from(activeGhostIds.keys())

      // Generate new Ghost IDs for all active wallets
      for (const walletAddress of walletAddresses) {
        const key = deriveEphemeralKey(masterSecret)
        const ghostId = encryptWalletToGhostId(walletAddress, key)

        activeGhostIds.set(walletAddress, ghostId)
        lastGenerationTime.set(walletAddress, Date.now())
      }
    }
  }, 5000) // Check every 5 seconds
}
