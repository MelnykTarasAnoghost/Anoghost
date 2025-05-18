import dotenv from 'dotenv';
dotenv.config(); 

const INTERVAL_SEC = 300

export async function deriveEphemeralKey(masterSecret: string): Promise<string> {
  // Get current time window (floor of current timestamp / interval)
  const now = Math.floor(Date.now() / 1000)
  const window = Math.floor(now / INTERVAL_SEC)

  // Use TextEncoder to convert strings to Uint8Array
  const encoder = new TextEncoder()
  const masterKeyData = encoder.encode(masterSecret)
  const windowData = encoder.encode(window.toString())

  // Import the master key
  const masterKey = await crypto.subtle.importKey("raw", masterKeyData, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ])

  // Generate the ephemeral key using HMAC
  const signature = await crypto.subtle.sign("HMAC", masterKey, windowData)

  // Convert to Base64
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

export async function encryptWalletToGhostId(walletAddress: string, ephemeralKeyB64: string): Promise<string> {
  // Generate a random IV (96 bits as recommended for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Convert the Base64 key to Uint8Array
  const keyBytes = Uint8Array.from(atob(ephemeralKeyB64), (c) => c.charCodeAt(0))

  // Import the key for encryption
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"])

  // Encode the wallet address
  const encoded = new TextEncoder().encode(walletAddress)

  // Encrypt the wallet address
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)

  // Combine IV + ciphertext for storage/transmission
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)

  // Convert to Base64
  return btoa(String.fromCharCode(...combined))
}

export async function generateGhostId(walletAddress: string, masterSecret?: string): Promise<string> {
  // Use provided master secret or a default one (in production, this would come from env vars)
  const secret = process.env.MASTER_SECRET!

  // Derive the ephemeral key
  const ephemeralKey = await deriveEphemeralKey(secret)

  // Encrypt the wallet address
  return encryptWalletToGhostId(walletAddress, ephemeralKey)
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
