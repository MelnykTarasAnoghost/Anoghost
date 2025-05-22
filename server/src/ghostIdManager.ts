import crypto from "crypto"

const INTERVAL_SEC = 300 // 5 minutes

const activeGhostIds = new Map<string, string>()
const lastGenerationTime = new Map<string, number>()

function deriveEphemeralKey(masterSecret: string, offset = 0): Buffer {
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / INTERVAL_SEC) + offset;
  return crypto.createHmac("sha256", masterSecret).update(window.toString()).digest();
}

function decryptGhostId(ghostId: string, key: Buffer): string {
  try {
    const combined = Buffer.from(ghostId, "base64");
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(combined.length - 16);
    const ciphertext = combined.subarray(12, combined.length - 16);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (e) {
    throw new Error("Failed to decrypt Ghost ID with the provided key");
  }
}

function encryptWalletToGhostId(walletAddress: string, key: Buffer): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

  const encrypted = Buffer.concat([
    cipher.update(walletAddress, "utf8"),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()
  const combined = Buffer.concat([iv, encrypted, authTag])

  return combined.toString("base64")
}

export function tryDecryptWithRotation(
  ghostId: string,
  masterSecret: string
): string {
  const numberOfWindowsToScan = 12;

  for (let i = 0; i < numberOfWindowsToScan; i++) {
    const offset = -i;
    try {
      const key = deriveEphemeralKey(masterSecret, offset);
      return decryptGhostId(ghostId, key);
    } catch (error) {
    }
  }
  throw new Error("Ghost doesn't exist (or not decryptable within the scanned window range)");
}

export function getGhostId(walletAddress: string, masterSecret: string, forceRefresh = false): string {
  const now = Date.now()
  const lastGen = lastGenerationTime.get(walletAddress) || 0

  const shouldRefresh =
    forceRefresh ||
    !activeGhostIds.has(walletAddress) ||
    now - lastGen > INTERVAL_SEC * 1000

  if (shouldRefresh) {
    const key = deriveEphemeralKey(masterSecret)
    const ghostId = encryptWalletToGhostId(walletAddress, key)

    activeGhostIds.set(walletAddress, ghostId)
    lastGenerationTime.set(walletAddress, now)

    return ghostId
  }

  return activeGhostIds.get(walletAddress)!
}

export function formatGhostId(ghostId: string): string {
  if (!ghostId || ghostId.length < 12) return ghostId
  const prefix = ghostId.slice(0, 12)
  return `${prefix.slice(0, 4)}-${prefix.slice(4, 8)}-${prefix.slice(8, 12)}`
}

export function validateGhostId(
  ghostId: string,
  masterSecret: string
): {
  isValid: boolean
  walletAddress?: string
  error?: string
} {
  try {
    const walletAddress = tryDecryptWithRotation(ghostId, masterSecret)
    return { isValid: true, walletAddress }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error validating Ghost ID",
    }
  }
}

export function scheduleGhostIdRotation(masterSecret: string): NodeJS.Timeout {
  return setInterval(() => {
    const now = Math.floor(Date.now() / 1000)
    const secondsIntoCurrentWindow = now % INTERVAL_SEC

    // Rotate close to window boundary
    if (secondsIntoCurrentWindow >= INTERVAL_SEC - 10) {
      const key = deriveEphemeralKey(masterSecret)
      const walletAddresses = Array.from(activeGhostIds.keys())

      for (const walletAddress of walletAddresses) {
        const ghostId = encryptWalletToGhostId(walletAddress, key)
        activeGhostIds.set(walletAddress, ghostId)
        lastGenerationTime.set(walletAddress, Date.now())
      }
    }
  }, 5000)
}

const HKDF_SALT_LENGTH = 16;
const AES_IV_LENGTH = 12;
const AES_KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;
const HKDF_INFO_STRING = 'AnoGhost-TimelessGhostId-KeyDerivation';
const HKDF_DIGEST_ALGORITHM = 'sha256';

export function generateTimelessGhostId(walletAddress: string, masterSecret: string): string {
    const hkdfSalt = crypto.randomBytes(HKDF_SALT_LENGTH);
    const masterSecretBuffer = Buffer.from(masterSecret, 'utf-8');
    const derivedKeyOutput = crypto.hkdfSync(
        HKDF_DIGEST_ALGORITHM,
        masterSecretBuffer,
        hkdfSalt,
        Buffer.from(HKDF_INFO_STRING, 'utf-8'),
        AES_KEY_LENGTH
    );
    // Ensure the derived key is treated as a Buffer for createCipheriv
    const derivedKeyAsBuffer = Buffer.from(derivedKeyOutput);

    const iv = crypto.randomBytes(AES_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKeyAsBuffer, iv);
    const encryptedWalletAddress = Buffer.concat([
        cipher.update(walletAddress, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([hkdfSalt, iv, encryptedWalletAddress, authTag]);
    return combined.toString('base64');
}

export function decryptTimelessGhostId(timelessGhostId: string, masterSecret: string): string {
    const combined = Buffer.from(timelessGhostId, 'base64');

    let offset = 0;

    const hkdfSalt = combined.subarray(offset, offset + HKDF_SALT_LENGTH);
    offset += HKDF_SALT_LENGTH;

    const iv = combined.subarray(offset, offset + AES_IV_LENGTH);
    offset += AES_IV_LENGTH;

    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encryptedWalletAddress = combined.subarray(offset, combined.length - AUTH_TAG_LENGTH);

    if (hkdfSalt.length !== HKDF_SALT_LENGTH || 
        iv.length !== AES_IV_LENGTH || 
        authTag.length !== AUTH_TAG_LENGTH ||
        encryptedWalletAddress.length < 0) {
        throw new Error('Invalid timelessGhostId structure or length.');
    }

    const masterSecretBuffer = Buffer.from(masterSecret, 'utf-8');
    const derivedKeyOutput = crypto.hkdfSync(
        HKDF_DIGEST_ALGORITHM,
        masterSecretBuffer,
        hkdfSalt,
        Buffer.from(HKDF_INFO_STRING, 'utf-8'),
        AES_KEY_LENGTH
    );
    const derivedKeyAsBuffer = Buffer.from(derivedKeyOutput);

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKeyAsBuffer, iv);
        decipher.setAuthTag(authTag);
        const decryptedWalletAddress = Buffer.concat([
            decipher.update(encryptedWalletAddress),
            decipher.final(),
        ]);
        return decryptedWalletAddress.toString('utf8');
    } catch (error) {
        throw new Error('Failed to decrypt timelessGhostId. Check masterSecret or ghostId integrity.');
    }
}
