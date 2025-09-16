import { useState, useEffect, SetStateAction } from "react";
import {
  generateAESKey,
  encryptBuffer,
  decryptBuffer,
  decryptAesKey,
  arrayBufferToBase64,
} from "../../utils/encryption";
import { getSocket, sendFileChunks } from "../../services/socket";
import { Message } from "../../types/encryption";
import useLastWallEncryption from "./useLastWallEncryption";
import { useLastWall } from "@/contexts/LastWallContext";

type FileTracking = {
  chunks: Map<number, ArrayBuffer>;
  totalChunks: number;
  fileName: string;
  fileType: string;
  iv?: string;
  authTag?: string;
  encryptedKey?: string;
};

/**
 * Hook for managing encrypted file transfers (upload & download).
 */
export function useFileTransfer({
  roomId,
  keyPair,
  participantKeys,
  nickname,
  isAloneInRoom,
  onAddMessage,
  onUpdateMessage,
}: {
  roomId: string;
  keyPair: any;
  participantKeys: Map<string, CryptoKey>;
  nickname: string;
  isAloneInRoom: boolean;
  onAddMessage: (msg: Message) => void;
  onUpdateMessage: (id: string, update: Partial<Message>) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(
    new Set()
  );
  const [fileChunks, setFileChunks] = useState<Map<string, FileTracking>>(
    new Map()
  );
  // --- NEW: State to store E2E decrypted file data ---
  const [e2eDecryptedFiles, setE2eDecryptedFiles] = useState<
    Map<string, ArrayBuffer>
  >(new Map());
  const { wallKey } = useLastWall(roomId);
  const {
    encryptBuffer: encryptLastWallBuffer,
    decryptBuffer: decryptLastWallBuffer,
  } = useLastWallEncryption(wallKey);

  const socket = getSocket();

  // 📥 Handle incoming file chunks (no changes here)
  useEffect(() => {
    if (!socket) return;

    const handleFileChunkReceived = (data: any) => {
      const {
        messageId,
        chunkIndex,
        chunk,
        final,
        senderNickname,
        fileName,
        fileSize,
        totalChunks,
        iv,
        authTag,
        encryptedKey,
      } = data;

      if (chunkIndex === 0 && fileName && totalChunks) {
        setFileChunks((prev) => {
          const next = new Map(prev);
          if (!next.has(messageId)) {
            next.set(messageId, {
              chunks: new Map(),
              totalChunks,
              fileName,
              fileType: fileName.split(".").pop() || "unknown",
              iv,
              authTag,
              encryptedKey,
            });
          }
          return next;
        });

        onAddMessage({
          id: messageId,
          sender: senderNickname,
          fileName,
          fileSize,
          fileType: fileName.split(".").pop() || "unknown",
          timestamp: Date.now(),
          type: "file",
        });
      }

      setFileChunks((prev) => {
        const next = new Map(prev);
        const fileData = next.get(messageId);
        if (fileData) {
          fileData.chunks.set(chunkIndex, chunk);
          if (final && fileData.chunks.size === fileData.totalChunks) {
            reconstructAndDecryptFile(messageId, fileData);
          }
        }
        return next;
      });
    };

    socket.on("fileChunkReceived", handleFileChunkReceived);
    return () => {
      socket.off("fileChunkReceived", handleFileChunkReceived);
    };
  }, [socket, onAddMessage]);

  // --- MODIFIED: Reconstruct and perform E2E decryption ONLY ---
  const reconstructAndDecryptFile = async (
    messageId: string,
    fileData: FileTracking
  ) => {
    const sortedChunks = Array.from(fileData.chunks.entries())
      .sort(([a], [b]) => a - b)
      .map(([, chunk]) => chunk);

    const totalSize = sortedChunks.reduce((sum, c) => sum + c.byteLength, 0);
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of sortedChunks) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    let e2eDecryptedBuffer = combined.buffer;

    if (fileData.iv && fileData.authTag && fileData.encryptedKey && keyPair) {
      try {
        const aesKey = await decryptAesKey(
          fileData.encryptedKey,
          keyPair.privateKey
        );
        e2eDecryptedBuffer = await decryptBuffer(
          e2eDecryptedBuffer,
          aesKey,
          fileData.iv,
          Uint8Array.from(atob(fileData.authTag), (c) => c.charCodeAt(0))
        );
      } catch (err) {
        console.error("[FileTransfer] Failed to E2E decrypt file:", err);
        // onUpdateMessage(messageId, { error: 'DECRYPTION_FAILED' });
        // Still clean up chunks
        setFileChunks((prev) => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
        return;
      }
    }

    // Store the intermediate E2E-decrypted buffer. This will trigger the useEffect below.
    setE2eDecryptedFiles((prev) =>
      new Map(prev).set(messageId, e2eDecryptedBuffer)
    );

    // Clean up the chunk tracking map
    setFileChunks((prev) => {
      const next = new Map(prev);
      next.delete(messageId);
      return next;
    });
  };

  // --- NEW: useEffect to apply wallKey decryption to all files when the key changes ---
  useEffect(() => {
    e2eDecryptedFiles.forEach((e2eBuffer, messageId) => {
      let finalData = e2eBuffer; // Default to the E2E decrypted version
      if (wallKey) {
        try {
          // Attempt to decrypt with the current wallKey
          finalData = decryptLastWallBuffer(e2eBuffer);
        } catch (err) {
          console.warn(
            `[FileTransfer] Failed to decrypt file ${messageId} with wall key. It may be incorrect.`
          );
          // If it fails, finalData remains the e2eBuffer, which is the desired fallback.
        }
      }
      // Update the message in the parent component with the newly processed data
      onUpdateMessage(messageId, {
        data: finalData,
        fileSize: finalData.byteLength,
      });
    });
  }, [wallKey, e2eDecryptedFiles, decryptLastWallBuffer]);

  // 📤 Upload file (no changes here)
  const handleFileUpload = async (file: File) => {
    if (!socket || !keyPair || isAloneInRoom) return;

    setIsUploading(true);
    setUploadProgress(0);

    const messageId = `file-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    onAddMessage({
      id: messageId,
      sender: nickname,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      timestamp: Date.now(),
      type: "file",
      isLocal: true,
    });

    try {
      let fileBuffer = await file.arrayBuffer();

      if (wallKey) {
        console.log("Encrypting files with wall key");
        fileBuffer = encryptLastWallBuffer(fileBuffer);
      }

      const aesKey = await generateAESKey();
      const { iv, encryptedData, authTag } = await encryptBuffer(
        fileBuffer,
        aesKey
      );

      const encryptedKeys: Record<string, string> = {};
      const allKeys = new Map(participantKeys);
      if (keyPair) {
        allKeys.set(socket.id || "", keyPair.publicKey);
      }
      for (const [participantId, publicKey] of allKeys.entries()) {
        const exportedAesKey = await crypto.subtle.exportKey("raw", aesKey);
        const encryptedKey = await crypto.subtle.encrypt(
          { name: "RSA-OAEP" },
          publicKey,
          exportedAesKey
        );
        encryptedKeys[participantId] = arrayBufferToBase64(encryptedKey);
      }

      socket.emit("fileChunkStart", {
        messageId,
        fileName: file.name,
        fileType: file.type,
        totalChunks: Math.ceil(encryptedData.byteLength / (64 * 1024)),
        encryptedKeys,
        iv,
      });

      await sendFileChunks(
        messageId,
        encryptedData,
        file.name,
        file.size,
        true,
        iv,
        authTag,
        (progress: SetStateAction<number>) => setUploadProgress(progress)
      );
    } catch (err) {
      console.error("[FileTransfer] Upload error:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 💾 Download file (no changes here)
  const handleFileDownload = async (msg: Message) => {
    if (!msg.data || !msg.fileName) return;

    setDownloadingFiles((prev) => new Set(prev).add(msg.id));

    try {
      const blob = new Blob([msg.data], {
        type: msg.fileType || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = msg.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[FileTransfer] Download error:", err);
    } finally {
      setDownloadingFiles((prev) => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
    }
  };

  return {
    isUploading,
    uploadProgress,
    downloadingFiles,
    handleFileUpload,
    handleFileDownload,
  };
}
