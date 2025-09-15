import { useEffect } from "react";
import {
  getSocket,
  sendMessage,
  sendEncryptedMessage,
  deleteMessage as deleteMessageFromService,
} from "../../services/socket";
import {
  decryptMessage,
  encryptGroupMessage,
  type KeyPair,
} from "../../utils/encryption";
import type { EncryptedMessageData } from "../../types/encryption";
import { Message, MessageExpiration } from "../../types/encryption";
import { useLastWall } from "@/contexts/LastWallContext";
import useLastWallEncryption from "./useLastWallEncryption";

interface UseChatMessagesProps {
  nickname: string;
  roomId: string;
  keyPair: KeyPair | null;
  participantKeys: Map<string, CryptoKey>;
  isAloneInRoom: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>; // <-- pass setMessages directly
}

export function useChatMessages({
  nickname,
  roomId,
  keyPair,
  participantKeys,
  isAloneInRoom,
  setMessages,
}: UseChatMessagesProps) {
  const socket = getSocket();
  const { wallKey } = useLastWall(roomId);
  const { decrypt } = useLastWallEncryption(wallKey || "");

  // 🔥 Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (data: any) => {
      setMessages((prev) => [...prev, { ...data }]);
    };

    const handleMessageSentAck = ({
      clientMessageId,
      serverMessageId,
    }: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === clientMessageId
            ? { ...msg, id: serverMessageId, isLocal: false }
            : msg
        )
      );
    };

    const handleEncryptedMessage = async (data: EncryptedMessageData) => {
      try {
        if (!keyPair || data.senderId === socket.id) return;

        let decryptedText = await decryptMessage(
          {
            iv: data.encryptedContent.iv,
            encryptedContent: data.encryptedContent.encryptedContent,
            encryptedKey: data.encryptedContent.encryptedKey,
            sender: data.sender,
          },
          keyPair.privateKey
        );

        // Add the additional decryption step for the 'wallKey'

        console.log("Decrypting", wallKey, decryptedText);
        if (wallKey && decryptedText) {
          decryptedText = decrypt(decryptedText);

          console.log("Decrypted", decryptedText, decrypt(decryptedText));
        }

        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            sender: data.sender,
            text: decryptedText,
            timestamp: data.timestamp,
            expiresAt: data.expiresAt,
          },
        ]);
      } catch (err) {
        console.error("[ChatMessages] Error decrypting message:", err);
      }
    };

    const handleUserJoined = (data: { nickname: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `join-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          sender: "system",
          text: `${data.nickname} joined the room`,
          timestamp: Date.now(),
        },
      ]);
    };

    const handleUserLeft = (data: { nickname: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `left-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          sender: "system",
          text: `${data.nickname} left the room`,
          timestamp: Date.now(),
        },
      ]);
    };

    const handleMessageExpired = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
    };

    socket.on("message", handleIncomingMessage);
    socket.on("encryptedMessage", handleEncryptedMessage);
    socket.on("messageSentAck", handleMessageSentAck);
    socket.on("messageExpired", handleMessageExpired);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("userJoinedRoom", handleUserJoined);
    socket.on("userLeftRoom", handleUserLeft);

    return () => {
      socket.off("message", handleIncomingMessage);
      socket.off("encryptedMessage", handleEncryptedMessage);
      socket.off("messageSentAck", handleMessageSentAck);
      socket.off("messageExpired", handleMessageExpired);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("userJoinedRoom", handleUserJoined);
      socket.off("userLeftRoom", handleUserLeft);
    };
  }, [socket, keyPair, nickname, setMessages, wallKey]);

  // Add this new useEffect hook below your existing one
  useEffect(() => {
    // Only proceed if a wallKey exists and the messages array is not empty
    if (wallKey && wallKey.length > 0) {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          // Check if the message text looks like an encrypted string
          // and has not already been decrypted by the wallKey
          const isEncrypted = msg?.text?.startsWith("U2FsdGVkX1");

          if (isEncrypted) {
            try {
              const decryptedText = decrypt(msg.text || "");
              // Return the message with the decrypted text
              return { ...msg, text: decryptedText };
            } catch (err) {
              console.error("Failed to decrypt a message from history:", err);
              return msg; // Return the original message if decryption fails
            }
          }
          return msg; // Return the original message if it doesn't need decryption
        })
      );
    }
  }, [wallKey, decrypt, setMessages]);
  // ✉️ Send message
  const send = async (text: string, expiration: MessageExpiration) => {
    if (!text.trim() || !socket || !keyPair || isAloneInRoom) return;

    const localMessageId = `local-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const expiresAt =
      expiration !== MessageExpiration.NEVER
        ? Date.now() + expiration
        : undefined;

    let messageToDisplay = text;
    if (wallKey) {
      messageToDisplay = decrypt(text);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: localMessageId,
        sender: nickname,
        text: messageToDisplay,
        timestamp: Date.now(),
        isLocal: true,
        expiresAt,
      },
    ]);

    try {
      if (participantKeys.size > 0) {
        const allKeys = new Map(participantKeys);
        allKeys.set(socket.id || "", keyPair.publicKey);

        const encryptedMessages = await encryptGroupMessage(text, allKeys);
        const encryptedObj: Record<string, any> = {};
        for (const [recipientId, msg] of encryptedMessages.entries()) {
          encryptedObj[recipientId] = {
            iv: msg.iv,
            encryptedContent: msg.encryptedContent,
            encryptedKey: msg.encryptedKey,
          };
        }

        const result = await sendEncryptedMessage(
          encryptedObj,
          expiresAt,
          localMessageId
        );
        if (!result.success)
          console.error(
            "[ChatMessages] Error sending encrypted message:",
            result.error
          );
      } else {
        const result = await sendMessage(text, expiresAt);
        if (!result.success)
          console.error("[ChatMessages] Error sending message:", result.error);
      }
    } catch (err) {
      console.error("[ChatMessages] Failed to send message:", err);
    }
  };

  // 🚮 Delete message locally and notify server
  const deleteMessage = async (id: string) => {
    // Remove immediately from UI
    setMessages((prev) => prev.filter((msg) => msg.id !== id));

    if (!socket || !roomId) return;

    try {
      await deleteMessageFromService(roomId, id);
      console.log(`[ChatMessages] Message ${id} deleted on server`);
    } catch (err) {
      console.error("[ChatMessages] Failed to delete message on server:", err);
    }
  };

  return { send, deleteMessage };
}
