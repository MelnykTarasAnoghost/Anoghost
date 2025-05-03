const key = crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  import { Buffer } from 'buffer'
  export async function encryptMessage(message) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await key,
      enc.encode(message)
    );
    return {
      encrypted: Buffer.from(encrypted).toString('base64'),
      iv: Buffer.from(iv).toString('base64')
    };
  }
  
  export async function decryptMessage(encrypted, iv) {
    const dec = new TextDecoder();
    const encryptedBuffer = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      await key,
      encryptedBuffer
    );
    return dec.decode(decrypted);
  }
  