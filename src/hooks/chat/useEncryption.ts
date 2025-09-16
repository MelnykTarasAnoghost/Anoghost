import { useEffect, useState } from "react";
import {
  generateKeyPair,
  importPublicKey,
  type KeyPair,
} from "../../utils/encryption";
import {
  getSocket,
  sharePublicKey,
  requestPublicKey,
} from "../../services/socket";
import type { PublicKeyData } from "../../types/encryption";

/**
 * Hook that manages end-to-end encryption setup in a chat room.
 */
export function useEncryption(roomId: string) {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [participantKeys, setParticipantKeys] = useState<Map<string, CryptoKey>>(new Map());
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);

  const socket = getSocket();

  // 🔑 Initialize our RSA key pair and announce ourselves
  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        // console.log("[Encryption] Generating RSA key pair...");
        const newKeyPair = await generateKeyPair();
        setKeyPair(newKeyPair);

        if (socket) {
          // console.log(`[Encryption] Sharing my public key in room ${roomId}`);
          await sharePublicKey(roomId, newKeyPair.publicKeyJwk);

          // console.log(`[Encryption] Requesting public keys from others in room ${roomId}`);
          requestPublicKey(roomId);
        }

        setIsEncryptionReady(true);
      } catch (error) {
        console.error("[Encryption] Failed to initialize:", error);
      }
    };

    initializeEncryption();
  }, [roomId, socket]);

  // 👂 Listen for public keys from other participants
  useEffect(() => {
    if (!socket) return;

    const handlePublicKeyShared = async (data: PublicKeyData) => {
      try {
        const { userId, publicKeyJwk } = data;
        if (userId === socket.id) {
          console.log("[Encryption] Ignored my own public key.");
          return;
        }

        const publicKey = await importPublicKey(publicKeyJwk);
        setParticipantKeys((prev) => {
          const updated = new Map(prev);
          updated.set(userId, publicKey);
          console.log("[Encryption] Added participant key:", userId);
          return updated;
        });
      } catch (err) {
        console.error("[Encryption] Error handling public key:", err);
      }
    };

    socket.on("publicKeyShared", handlePublicKeyShared);
    return () => {
      socket.off("publicKeyShared", handlePublicKeyShared);
    };
  }, [socket]);

  // 👂 When someone requests our key, share it
  useEffect(() => {
    if (!socket || !keyPair) return;

    const handlePublicKeyRequested = async (data: { requesterId: string }) => {
      try {
        console.log(`[Encryption] Received key request from ${data.requesterId}`);
        await sharePublicKey(roomId, keyPair.publicKeyJwk);
      } catch (err) {
        console.error("[Encryption] Error responding to key request:", err);
      }
    };

    socket.on("publicKeyRequested", handlePublicKeyRequested);
    return () => {
      socket.off("publicKeyRequested", handlePublicKeyRequested);
    };
  }, [socket, keyPair, roomId]);

  return {
    keyPair,
    participantKeys,
    isEncryptionReady,
  };
}
