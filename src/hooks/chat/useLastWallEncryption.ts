import { useCallback } from 'react';
import CryptoJS from 'crypto-js';

type EncryptionResult = string;
type BufferResult = ArrayBuffer;

type UseLastWallEncryption = (key?: string) => {
  encrypt: (plainText: string) => EncryptionResult;
  decrypt: (encryptedText: string) => EncryptionResult;
  encryptBuffer: (buffer: ArrayBuffer) => BufferResult;
  decryptBuffer: (buffer: ArrayBuffer) => BufferResult;
};

const isValidKey = (key?: string) =>
  !!key && key.length >= 8 && key.length <= 24;

const useLastWallEncryption: UseLastWallEncryption = (key) => {
  // --- String encryption ---
  const encrypt = useCallback(
    (plainText: string): EncryptionResult => {
      if (!isValidKey(key)) return plainText;

      try {
        const ciphertext = CryptoJS.AES.encrypt(plainText, key as string).toString();
        return ciphertext;
      } catch (err) {
        console.error('Encryption error:', err);
        return plainText;
      }
    },
    [key]
  );

  const decrypt = useCallback(
    (encryptedText: string): EncryptionResult => {
      if (!isValidKey(key)) return encryptedText;

      try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, key as string);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || encryptedText;
      } catch (err) {
        console.error('Decryption error:', err);
        return encryptedText;
      }
    },
    [key]
  );

  // --- Buffer helpers using Base64 encoding ---
  const encryptBuffer = useCallback(
    (buffer: ArrayBuffer): BufferResult => {
      if (!isValidKey(key)) return buffer;

      try {
        // ArrayBuffer -> Base64 string
        const u8 = new Uint8Array(buffer);
        const base64 = btoa(String.fromCharCode(...u8));
        // Encrypt the Base64 string
        const encryptedBase64 = encrypt(base64);
        // Return as ArrayBuffer
        const u8Encrypted = Uint8Array.from(
          atob(encryptedBase64),
          c => c.charCodeAt(0)
        );
        return u8Encrypted.buffer;
      } catch (err) {
        console.error('Buffer encryption error:', err);
        return buffer;
      }
    },
    [key, encrypt]
  );

  const decryptBuffer = useCallback(
    (buffer: ArrayBuffer): BufferResult => {
      if (!isValidKey(key)) return buffer;

      try {
        // ArrayBuffer -> Base64 string
        const u8 = new Uint8Array(buffer);
        const base64 = btoa(String.fromCharCode(...u8));
        // Decrypt Base64 string
        const decryptedBase64 = decrypt(base64);
        // Return as ArrayBuffer
        const u8Decrypted = Uint8Array.from(
          atob(decryptedBase64),
          c => c.charCodeAt(0)
        );
        return u8Decrypted.buffer;
      } catch (err) {
        console.error('Buffer decryption error:', err);
        return buffer;
      }
    },
    [key, decrypt]
  );

  return { encrypt, decrypt, encryptBuffer, decryptBuffer };
};

export default useLastWallEncryption;
