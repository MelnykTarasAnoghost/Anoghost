
// Type definitions
export interface KeyPair {
    publicKey: CryptoKey
    privateKey: CryptoKey
    publicKeyJwk: JsonWebKey // Exportable format for transmission
  }
  
  // Update the EncryptedMessage interface to include sender ID
  export interface EncryptedMessage {
    iv: string // Initialization vector (base64)
    encryptedContent: string // Encrypted content (base64)
    encryptedKey: string // Encrypted AES key (base64)
    sender: string // Sender's identifier
    senderId?: string // Sender's socket ID
  }
  
  // Generate RSA key pair for asymmetric encryption
  export async function generateKeyPair(): Promise<KeyPair> {
    try {
      // Generate RSA key pair
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]), // 65537
          hash: "SHA-256",
        },
        true, // extractable
        ["encrypt", "decrypt"], // key usages
      )
  
      // Export public key to JWK format for transmission
      const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey)
  
      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        publicKeyJwk,
      }
    } catch (error) {
      console.error("Error generating key pair:", error)
      throw new Error("Failed to generate encryption keys")
    }
  }
  
  // Import a public key from JWK format
  export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
    try {
      return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["encrypt"],
      )
    } catch (error) {
      console.error("Error importing public key:", error)
      throw new Error("Failed to import public key")
    }
  }
  
  // Generate a random AES key for symmetric encryption
  export async function generateAESKey(): Promise<CryptoKey> {
    try {
      return await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"],
      )
    } catch (error) {
      console.error("Error generating AES key:", error)
      throw new Error("Failed to generate encryption key")
    }
  }
  
  // Encrypt a message using hybrid encryption (RSA + AES)
  export async function encryptMessage(message: string, recipientPublicKey: CryptoKey): Promise<EncryptedMessage> {
    try {
      // Generate a random AES key for this message
      const aesKey = await generateAESKey()
  
      // Generate a random initialization vector
      const iv = window.crypto.getRandomValues(new Uint8Array(12))
  
      // Encrypt the message with AES-GCM
      const encodedMessage = new TextEncoder().encode(message)
      const encryptedContent = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
        },
        aesKey,
        encodedMessage,
      )
  
      // Export the AES key
      const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey)
  
      // Encrypt the AES key with the recipient's public key
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        recipientPublicKey,
        exportedAesKey,
      )
  
      // Convert binary data to base64 strings for transmission
      return {
        iv: arrayBufferToBase64(iv),
        encryptedContent: arrayBufferToBase64(encryptedContent),
        encryptedKey: arrayBufferToBase64(encryptedKey),
        sender: "", // Will be filled in by the sender
      }
    } catch (error) {
      console.error("Error encrypting message:", error)
      throw new Error("Failed to encrypt message")
    }
  }
  
  // Decrypt a message using the recipient's private key
  export async function decryptMessage(encryptedMessage: EncryptedMessage, privateKey: CryptoKey): Promise<string> {
    try {
      // Convert base64 strings back to ArrayBuffers
      const iv = base64ToArrayBuffer(encryptedMessage.iv)
      const encryptedContent = base64ToArrayBuffer(encryptedMessage.encryptedContent)
      const encryptedKey = base64ToArrayBuffer(encryptedMessage.encryptedKey)
  
      // Decrypt the AES key using the private key
      const aesKeyData = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        privateKey,
        encryptedKey,
      )
  
      // Import the decrypted AES key
      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        aesKeyData,
        {
          name: "AES-GCM",
          length: 256,
        },
        false,
        ["decrypt"],
      )
  
      // Decrypt the content using the AES key
      const decryptedContent = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
        },
        aesKey,
        encryptedContent,
      )
  
      // Decode the decrypted content to a string
      return new TextDecoder().decode(decryptedContent)
    } catch (error) {
      console.error("Error decrypting message:", error)
      return "[Encrypted message - cannot decrypt]"
    }
  }
  
  // Helper function to convert ArrayBuffer to Base64 string
  export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
  
  // Helper function to convert Base64 string to ArrayBuffer
  export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }
  
  // Update the encryptGroupMessage function to include expiration
  export async function encryptGroupMessage(
    message: string,
    recipientPublicKeys: Map<string, CryptoKey>,
  ): Promise<Map<string, EncryptedMessage>> {
    try {
      const encryptedMessages = new Map<string, EncryptedMessage>()
  
      // Generate a single AES key for this message
      const aesKey = await generateAESKey()
  
      // Generate a random initialization vector
      const iv = window.crypto.getRandomValues(new Uint8Array(12))
  
      // Encrypt the message with AES-GCM
      const encodedMessage = new TextEncoder().encode(message)
      const encryptedContent = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
        },
        aesKey,
        encodedMessage,
      )
  
      // Export the AES key
      const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey)
  
      // For each recipient, encrypt the AES key with their public key
      for (const [recipientId, publicKey] of recipientPublicKeys.entries()) {
        const encryptedKey = await window.crypto.subtle.encrypt(
          {
            name: "RSA-OAEP",
          },
          publicKey,
          exportedAesKey,
        )
  
        encryptedMessages.set(recipientId, {
          iv: arrayBufferToBase64(iv),
          encryptedContent: arrayBufferToBase64(encryptedContent),
          encryptedKey: arrayBufferToBase64(encryptedKey),
          sender: "", // Will be filled in by the sender
        })
      }
  
      return encryptedMessages
    } catch (error) {
      console.error("Error encrypting group message:", error)
      throw new Error("Failed to encrypt group message")
    }
  }
  