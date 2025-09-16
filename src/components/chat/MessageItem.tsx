// components/Chat/MessageItem.tsx
"use client";

import type React from "react";
import { Trash2, Download, FileText } from "lucide-react";
import MessageExpirationIndicator from "./MessageExpirationIndicator";
import { formatFileSize, formatTime, getFileIcon } from "../../utils/chatUtils";
import { RandomSymbolsAnimation } from "../RandomSymbolsAnimation";
import { useLastWall } from "@/contexts/LastWallContext";
import { useEffect, useState } from "react";

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

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  nickname: string;
  onDelete: (messageId: string) => void;
  onDownload: (message: Message) => void;
  onExpired: (messageId: string) => void;
  isDownloading: boolean;
  roomId: string;
}

const SystemMessage: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-[#0f0f0f] text-gray-400 text-xs py-2 px-4 rounded-full border border-[#1a1a1a] mx-auto my-3 flex items-center max-w-fit animate-fade-in">
    {text}
  </div>
);

const TextMessage: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  onDelete,
  onExpired,
  roomId,
}) => {
  const { wallKey } = useLastWall(roomId);

  const [showGlitch, setShowGlitch] = useState(false);

  // коли змінюється wallKey → запускаємо анімацію на 2 сек
  useEffect(() => {
    if (!wallKey) return;
    setShowGlitch(true);

    const timer = setTimeout(() => {
      setShowGlitch(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [wallKey]);

  return (
    <div
      className={`flex items-end gap-1 max-w-[80%] ${
        isOwnMessage ? "animate-slide-in-right" : "animate-slide-in-left"
      }`}
    >
      <div
        className={`p-3 rounded-2xl flex flex-col relative transition-all duration-300 ${
          isOwnMessage
            ? "bg-[#FF4D00] text-black rounded-br-md ml-auto"
            : "bg-[#1a1a1a] text-white rounded-bl-md"
        }`}
      >
        {!isOwnMessage && (
          <p className="text-xs font-medium mb-1 opacity-80">
            {message.sender}
          </p>
        )}
        <p className="font-light whitespace-pre-wrap break-words leading-relaxed">
          {showGlitch && !isOwnMessage ? (
            <RandomSymbolsAnimation
              variant="glitch"
              length={message.text?.length}
              speed={50}
            />
          ) : (
            message.text
          )}
        </p>
        <div className="flex justify-between items-center mt-2 gap-2">
          <p className="text-xs opacity-70 font-light">
            {formatTime(message.timestamp)}
          </p>
          {message.expiresAt && (
            <MessageExpirationIndicator
              expiresAt={message.expiresAt}
              onExpired={() => onExpired(message.id)}
            />
          )}
        </div>
      </div>
      {isOwnMessage && (
        <button
          onClick={() => onDelete(message.id)}
          className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transform"
          title="Delete Message"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

const FileMessage: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  onDelete,
  onDownload,
  onExpired,
  isDownloading,
}) => (
  <div
    className={`flex items-end gap-2 max-w-[80%] ${
      isOwnMessage ? "animate-slide-in-right" : "animate-slide-in-left"
    }`}
  >
    <div
      className={`p-3 rounded-2xl flex flex-col transition-all duration-300 ${
        isOwnMessage
          ? "bg-[#FF4D00] text-black rounded-br-md ml-auto"
          : "bg-[#1a1a1a] text-white rounded-bl-md"
      }`}
    >
      {!isOwnMessage && (
        <p className="text-xs font-medium mb-1 opacity-80">{message.sender}</p>
      )}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isOwnMessage ? "bg-black/20" : "bg-white/10"
          }`}
        >
          {message.fileType ? (
            getFileIcon(message.fileType)
          ) : (
            <FileText size={20} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {message.fileName || "File attachment"}
          </p>
          {message.fileSize && (
            <p className="text-xs opacity-70">
              {formatFileSize(message.fileSize)}
            </p>
          )}
        </div>
        {message.data && (
          <button
            onClick={() => onDownload(message)}
            disabled={isDownloading}
            className={`p-2 rounded-lg transition-colors ${
              isOwnMessage
                ? "hover:bg-black/20 text-black"
                : "hover:bg-white/10 text-white"
            } ${isDownloading ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Download file"
          >
            <Download size={16} />
          </button>
        )}
      </div>
      <div className="flex justify-between items-center mt-2 gap-2">
        <p className="text-xs opacity-70 font-light">
          {formatTime(message.timestamp)}
        </p>
        {message.expiresAt && (
          <MessageExpirationIndicator
            expiresAt={message.expiresAt}
            onExpired={() => onExpired(message.id)}
          />
        )}
      </div>
    </div>
    {isOwnMessage && (
      <button
        onClick={() => onDelete(message.id)}
        className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transform"
        title="Delete Message"
      >
        <Trash2 size={14} />
      </button>
    )}
  </div>
);

const MessageItem: React.FC<MessageItemProps> = (props) => {
  const { message } = props;

  if (message.sender === "system") {
    return <SystemMessage text={message.text || ""} />;
  }

  if (message.type === "file" || message.data) {
    return <FileMessage {...props} />;
  }

  if (message.text) {
    return <TextMessage {...props} />;
  }

  return null;
};

export default MessageItem;
