"use client";

import type React from "react";
import { useState, useEffect, useRef, use } from "react";
import TypingIndicator from "./TypingIndicator";
import MessageInput from "./MessageInput";
import { groupMessagesByDate } from "../../utils/chatUtils";
import MessageItem from "./MessageItem";
import { useEncryption } from "../../hooks/chat/useEncryption";
import { useFileTransfer } from "../../hooks/chat/useFileTransfer";
import { useChatMessages } from "../../hooks/chat/useChatMessages";
import { useTyping } from "../../hooks/chat/useTyping";
import ChatHeader from "./ChatHeader";
import { useLastWall } from "@/contexts/LastWallContext";
import useLastWallEncryption from "@/hooks/chat/useLastWallEncryption";

interface Message {
  id: string;
  sender: string;
  text?: string;
  data?: ArrayBuffer;
  type?: string;
  timestamp: number;
  isLocal?: boolean;
  expiresAt?: number;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  isDownloading?: boolean;
}

interface RoomData {
  roomId: string;
  roomName: string;
  accessToken?: string;
  participants: Array<{ nickname: string; joinedAt: number }>;
}

interface ChatAreaProps {
  roomData: RoomData;
  nickname: string;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  isCreator?: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  roomData,
  nickname,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  isCreator = false,
}) => {
  const { keyPair, participantKeys, isEncryptionReady } = useEncryption(
    roomData.roomId
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const isAloneInRoom = roomData.participants.length <= 1;
  const { sendTypingStatus, typingUsers } = useTyping({
    roomId: roomData.roomId,
    nickname,
  });

  const { send: handleSendMessage, deleteMessage } = useChatMessages({
    nickname,
    roomId: roomData.roomId,
    keyPair,
    participantKeys,
    isAloneInRoom,
    setMessages,
  });

  const {
    isUploading,
    uploadProgress,
    downloadingFiles,
    handleFileUpload,
    handleFileDownload,
  } = useFileTransfer({
    roomId: roomData.roomId,
    keyPair,
    participantKeys,
    nickname,
    isAloneInRoom,
    onAddMessage: (msg: Message) => setMessages((prev) => [...prev, msg]),
    onUpdateMessage: (id: string, update: any) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...update } : m))
      ),
  });
  const { wallKey } = useLastWall(roomData.roomId);
  const { decrypt } = useLastWallEncryption(wallKey || "");

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 920);
    };

    checkMobileView();
    window.addEventListener("resize", checkMobileView);

    return () => {
      window.removeEventListener("resize", checkMobileView);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        sender: "system",
        text: `Welcome to ${roomData.roomName}! Your messages are anonymous and end-to-end encrypted.`,
        timestamp: Date.now(),
      },
    ]);
  }, [roomData.roomId, roomData.roomName]);

  const typingUsersArray = Array.from(typingUsers.values());
  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader
        roomName={roomData.roomName}
        participantsCount={roomData.participants.length}
        isEncryptionReady={isEncryptionReady}
        isMobileView={isMobileView}
        onToggleLeftSidebar={onToggleLeftSidebar}
        onToggleRightSidebar={onToggleRightSidebar}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-black scrollbar-thin scrollbar-thumb-[#1a1a1a] scrollbar-track-black ">
        <div className="space-y-6  mx-auto">
          {messageGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-4">
              <div className="flex items-center justify-center my-6">
                <div className="bg-[#1a1a1a] text-gray-400 text-xs py-2 px-4 rounded-full border border-[#2a2a2a] animate-fade-in">
                  {group.date}
                </div>
              </div>
              {group.messages.map((msg, index) => {
                const isOwnMessage = msg.isLocal || msg.sender === nickname;

                // console.log(wallKey)
                // if(wallKey && msg.sender !== "system") {
                //   msg.text = decrypt(msg.text || "")
                //   console.log(msg.text)
                // }

                return (
                  <div
                    key={msg.id}
                    className={`group flex ${
                      msg.sender === nickname || msg.isLocal
                        ? "justify-end"
                        : "justify-start"
                    } ${msg.sender === "system" ? "justify-center" : ""}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <MessageItem
                      message={msg}
                      isOwnMessage={isOwnMessage}
                      nickname={nickname}
                      onDelete={deleteMessage}
                      onDownload={handleFileDownload}
                      onExpired={deleteMessage}
                      isDownloading={downloadingFiles.has(msg.id)}
                      roomId={roomData.roomId}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          {typingUsersArray.length > 0 && (
            <div className="flex justify-start w-full max-w-4xl mx-auto">
              <TypingIndicator typingUsers={typingUsersArray} />
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        isAloneInRoom={isAloneInRoom}
        isCreator={isCreator}
        disabled={!isEncryptionReady}
        onTyping={sendTypingStatus}
        roomId={roomData.roomId}
      />
    </div>
  );
};

export default ChatArea;
