// Types for encrypted messages and keys
export interface EncryptedMessageData {
    id: string
    sender: string
    senderId?: string // Add the senderId property
    encryptedContent: {
      iv: string
      encryptedContent: string
      encryptedKey: string
    }
    timestamp: number
    expiresAt?: number // Add expiration timestamp
  }
  
  export interface PublicKeyData {
    userId: string
    publicKeyJwk: JsonWebKey
  }
  
  // Add message expiration options
  export enum MessageExpiration {
    NEVER = 0,
    FIVE_MINUTES = 5 * 60 * 1000,
    ONE_HOUR = 60 * 60 * 1000,
    ONE_DAY = 24 * 60 * 60 * 1000,
    ONE_WEEK = 7 * 24 * 60 * 60 * 1000,
  }
  