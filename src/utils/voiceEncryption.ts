const IV_LENGTH = 12; // Recommended for AES-GCM

/**
 * Generates a new AES-GCM CryptoKey for E2EE.
 */
export async function createRoomKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // exportable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an audio frame using the shared room key.
 * Prepends a random IV to the ciphertext.
 */
export async function encryptFrame(key: CryptoKey, frameData: ArrayBuffer): Promise<ArrayBuffer> {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    frameData
  );

  const combinedBuffer = new Uint8Array(iv.length + encryptedData.byteLength);
  combinedBuffer.set(iv, 0);
  combinedBuffer.set(new Uint8Array(encryptedData), iv.length);

  return combinedBuffer.buffer;
}

/**
 * Decrypts an audio frame using the shared room key.
 * Extracts the IV from the start of the buffer.
 */
export async function decryptFrame(key: CryptoKey, encryptedFrame: ArrayBuffer): Promise<ArrayBuffer> {
  const data = new Uint8Array(encryptedFrame);
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);

  return window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );
}