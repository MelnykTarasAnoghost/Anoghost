import crypto from 'crypto';

const INTERVAL_SEC = 300;

function deriveEphemeralKey(master: string, offset = 0): Buffer {
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / INTERVAL_SEC) + offset;
  return crypto.createHmac('sha256', master).update(window.toString()).digest(); // 32 bytes
}

function decryptGhostID(ghostIdB64: string, key: Buffer): string {
  const bin = Buffer.from(ghostIdB64, 'base64');
  const iv = bin.subarray(0, 12);
  const ct = bin.subarray(12);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString('utf8');
}

export function tryDecryptWithRotation(ghostId: string, master: string): string {
  for (const offset of [0, -1]) {
    try {
      const key = deriveEphemeralKey(master, offset);
      return decryptGhostID(ghostId, key);
    } catch {
      continue;
    }
  }
  throw new Error("Ghost doesn't exist");
}
