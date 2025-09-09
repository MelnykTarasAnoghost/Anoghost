"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  getSocket,
  sendMessage,
  sharePublicKey,
  sendEncryptedMessage,
  sendLargeData,
  deleteMessage as deleteMessageFromService,
} from "../../services/socket"
import {
  generateKeyPair,
  importPublicKey,
  decryptMessage,
  encryptGroupMessage,
  type KeyPair,
} from "../../utils/encryption"
import type { EncryptedMessageData, PublicKeyData } from "../../types/encryption"
import { MessageExpiration } from "../../types/encryption"
import { Users, Menu, Trash2 } from "lucide-react"
import TypingIndicator from "./TypingIndicator"
import MessageExpirationIndicator from "./MessageExpirationIndicator"
import MessageInput from "./MessageInput"
import { useTypingStatus } from "../../hooks/useTypingStatus"

interface Message {
  id: string
  sender: string
  text?: string
  data?: ArrayBuffer
  type?: string
  timestamp: number
  isLocal?: boolean
  expiresAt?: number
}

interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  participants: Array<{ nickname: string; joinedAt: number }>
}

interface ChatAreaProps {
  roomData: RoomData
  nickname: string
  onToggleLeftSidebar: () => void
  onToggleRightSidebar: () => void
  isCreator?: boolean
}

const ChatArea: React.FC<ChatAreaProps> = ({
  roomData,
  nickname,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  isCreator = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socket = getSocket()
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null)
  const [participantKeys, setParticipantKeys] = useState<Map<string, CryptoKey>>(new Map())
  const [encryptedMessages, setEncryptedMessages] = useState<Map<string, EncryptedMessageData>>(new Map())
  const [isEncryptionReady, setIsEncryptionReady] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [isMobileView, setIsMobileView] = useState(false)

  const isAloneInRoom = roomData.participants.length <= 1

  useTypingStatus(roomData.roomId, "")

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768)
    }

    checkMobileView()
    window.addEventListener("resize", checkMobileView)

    return () => {
      window.removeEventListener("resize", checkMobileView)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        const newKeyPair = await generateKeyPair()
        setKeyPair(newKeyPair)

        if (socket) {
          await sharePublicKey(roomData.roomId, newKeyPair.publicKeyJwk)
        }

        setIsEncryptionReady(true)
      } catch (error) {
        console.error("Error initializing encryption:", error)
      }
    }

    initializeEncryption()
  }, [roomData.roomId, socket])

  useEffect(() => {
    if (!socket) return

    const handleTypingStatus = (data: {
      userId: string
      nickname: string
      isTyping: boolean
    }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev)
        if (data.isTyping) {
          newMap.set(data.userId, data.nickname)
        } else {
          newMap.delete(data.userId)
        }
        return newMap
      })
    }

    socket.on("userTypingStatus", handleTypingStatus)

    return () => {
      socket.off("userTypingStatus", handleTypingStatus)
    }
  }, [socket])

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        sender: "system",
        text: `Welcome to ${roomData.roomName}! Your messages are anonymous and end-to-end encrypted.`,
        timestamp: Date.now(),
      },
    ])
  }, [roomData.roomId, roomData.roomName])

  useEffect(() => {
    if (!socket) return

    const handleIncomingMessage = (data: {
      id: string
      sender: string
      text: string
      type?: string
      timestamp: number
      expiresAt?: number
    }) => {
      setMessages((prevMessages) => {
        const existingMessageIndex = prevMessages.findIndex(
          (msg) => msg.isLocal && msg.text === data.text && msg.sender === nickname,
        )

        if (existingMessageIndex !== -1) {
          const updatedMessages = [...prevMessages]
          updatedMessages[existingMessageIndex] = {
            ...data,
            isLocal: false,
          }
          return updatedMessages
        } else {
          return [...prevMessages, data]
        }
      })
    }

    const handleLargeMessage = (data: {
      id: string
      sender: string
      data: ArrayBuffer
      timestamp: number
    }) => {
      setMessages((prev) => [...prev, data])
    }

    const handleUserJoined = (data: {
      nickname: string
      participants: Array<{ nickname: string; joinedAt: number }>
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `join-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          sender: "system",
          text: `${data.nickname} joined the room`,
          timestamp: Date.now(),
        },
      ])
    }

    const handleUserLeft = (data: {
      nickname: string
      participants: Array<{ nickname: string; joinedAt: number }>
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "system",
          text: `${data.nickname} left the room`,
          timestamp: Date.now(),
        },
      ])
    }

    const handlePublicKeyShared = async (data: PublicKeyData) => {
      try {
        const { userId, publicKeyJwk } = data
        const publicKey = await importPublicKey(publicKeyJwk)
        setParticipantKeys((prev) => {
          const newMap = new Map(prev)
          newMap.set(userId, publicKey)
          return newMap
        })
      } catch (error) {
        console.error("Error handling shared public key:", error)
      }
    }

    const handleEncryptedMessage = async (data: EncryptedMessageData) => {
      try {
        setEncryptedMessages((prev) => {
          const newMap = new Map(prev)
          newMap.set(data.id, data)
          return newMap
        })

        if (socket && data.senderId === socket.id) {
          return
        }

        if (keyPair) {
          const decryptedText = await decryptMessage(
            {
              iv: data.encryptedContent.iv,
              encryptedContent: data.encryptedContent.encryptedContent,
              encryptedKey: data.encryptedContent.encryptedKey,
              sender: data.sender,
            },
            keyPair.privateKey,
          )

          setMessages((prev) => [
            ...prev,
            {
              id: data.id,
              sender: data.sender,
              text: decryptedText,
              timestamp: data.timestamp,
              expiresAt: data.expiresAt,
            },
          ])
        }
      } catch (error) {
        console.error("Error handling encrypted message:", error)
      }
    }

    const handlePublicKeyRequested = async (data: { requesterId: string }) => {
      try {
        if (keyPair) {
          await sharePublicKey(roomData.roomId, keyPair.publicKeyJwk)
        }
      } catch (error) {
        console.error("Error handling public key request:", error)
      }
    }

    const handleMessageExpired = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId))
    }

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId))
    }

    socket.on("message", handleIncomingMessage)
    socket.on("largeMessage", handleLargeMessage)
    socket.on("userJoinedRoom", handleUserJoined)
    socket.on("userLeftRoom", handleUserLeft)
    socket.on("publicKeyShared", handlePublicKeyShared)
    socket.on("encryptedMessage", handleEncryptedMessage)
    socket.on("publicKeyRequested", handlePublicKeyRequested)
    socket.on("requestPublicKey", handlePublicKeyRequested)
    socket.on("messageExpired", handleMessageExpired)
    socket.on("messageDeleted", handleMessageDeleted)

    return () => {
      socket.off("message", handleIncomingMessage)
      socket.off("largeMessage", handleLargeMessage)
      socket.off("userJoinedRoom", handleUserJoined)
      socket.off("userLeftRoom", handleUserLeft)
      socket.off("publicKeyShared", handlePublicKeyShared)
      socket.off("encryptedMessage", handleEncryptedMessage)
      socket.off("publicKeyRequested", handlePublicKeyRequested)
      socket.off("requestPublicKey", handlePublicKeyRequested)
      socket.off("messageExpired", handleMessageExpired)
      socket.off("messageDeleted", handleMessageDeleted)
    }
  }, [socket, roomData.roomName, keyPair, roomData.roomId, nickname])

  const handleSendMessage = async (messageText: string, messageExpiration: MessageExpiration) => {
    if (!messageText.trim() || !socket || !isEncryptionReady || !keyPair || isAloneInRoom) {
      return
    }

    try {
      const localMessageId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const expiresAt = messageExpiration !== MessageExpiration.NEVER ? Date.now() + messageExpiration : undefined

      setMessages((prev) => {
        return [
          ...prev,
          {
            id: localMessageId,
            sender: nickname,
            text: messageText,
            timestamp: Date.now(),
            isLocal: true,
            expiresAt,
          },
        ]
      })

      if (participantKeys.size > 0) {
        const allKeys = new Map(participantKeys)
        if (keyPair) {
          allKeys.set(socket.id, keyPair.publicKey)
        }

        const encryptedMessages = await encryptGroupMessage(messageText, allKeys)

        const encryptedMessagesObj: Record<string, any> = {}
        for (const [recipientId, encryptedMsg] of encryptedMessages.entries()) {
          encryptedMessagesObj[recipientId] = {
            iv: encryptedMsg.iv,
            encryptedContent: encryptedMsg.encryptedContent,
            encryptedKey: encryptedMsg.encryptedKey,
          }
        }

        const result = await sendEncryptedMessage(encryptedMessagesObj, expiresAt)

        if (!result.success) {
          console.error("Error sending encrypted message:", result.error)
        }
      } else {
        const result = await sendMessage(messageText, expiresAt)

        if (!result.success) {
          console.error("Error sending message:", result.error)
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    console.log(`Attempting to delete message with ID: ${messageId}`)
    if (!socket || !roomData.roomId) {
      console.error("Socket not available or roomId not found. Cannot delete message.")
      return
    }
    try {
      await deleteMessageFromService(roomData.roomId, messageId)
      console.log(`Message with ID ${messageId} sent for deletion.`)
    } catch (error) {
      console.error("Failed to send message deletion request:", error)
    }
  }

  const handleMessageExpired = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
  }

  const handleFileUpload = async (file: File) => {
    if (!socket) {
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      const fileType = file.type || "application/octet-stream"
      const result = await sendLargeData(file, fileType, (progress) => {
        setUploadProgress(progress)
      })

      if (!result.success) {
        console.error("Error uploading file:", result.error)
      }
    } catch (error) {
      console.error("Error uploading file:", error)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    }
  }

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ""
    let currentGroup: Message[] = []

    messages.forEach((message) => {
      const messageDate = formatMessageDate(message.timestamp)

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup })
        }
        currentDate = messageDate
        currentGroup = [message]
      } else {
        currentGroup.push(message)
      }
    })

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup })
    }

    return groups
  }

  const renderMessageContent = (message: Message) => {
    if (message.sender === "system") {
      return (
        <div className="bg-[#0f0f0f] text-gray-400 text-xs py-2 px-4 rounded-full border border-[#1a1a1a] mx-auto my-3 flex items-center max-w-fit animate-fade-in">
          {message.text}
        </div>
      )
    }

    const isOwnMessage = message.isLocal || message.sender === nickname

    if (message.text) {
      return (
        <div
          className={`flex items-end gap-2 max-w-[80%] ${isOwnMessage ? "animate-slide-in-right" : "animate-slide-in-left"}`}
        >
          <div
            className={`p-3 rounded-2xl flex flex-col relative transition-all duration-300 hover:scale-[1.02] ${
              isOwnMessage ? "bg-[#FF4D00] text-black rounded-br-md ml-auto" : "bg-[#1a1a1a] text-white rounded-bl-md"
            }`}
          >
            {!isOwnMessage && <p className="text-xs font-medium mb-1 opacity-80">{message.sender}</p>}
            <p className="font-light whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
            <div className="flex justify-between items-center mt-2 gap-2">
              <p className="text-xs opacity-70 font-light">{formatTime(message.timestamp)}</p>
              {message.expiresAt && (
                <MessageExpirationIndicator
                  expiresAt={message.expiresAt}
                  onExpired={() => handleMessageExpired(message.id)}
                />
              )}
            </div>
          </div>
          {isOwnMessage && message.sender !== "system" && (
            <button
              onClick={() => handleDeleteMessage(message.id)}
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full hover:scale-110 transform"
              title="Delete Message"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    }

    if (message.data) {
      return (
        <div
          className={`flex items-end gap-2 max-w-[80%] ${message.sender === nickname || message.isLocal ? "animate-slide-in-right" : "animate-slide-in-left"}`}
        >
          <div
            className={`p-3 rounded-2xl flex flex-col transition-all duration-300 hover:scale-[1.02] ${
              message.sender === nickname || message.isLocal
                ? "bg-[#FF4D00] text-black rounded-br-md ml-auto"
                : "bg-[#1a1a1a] text-white rounded-bl-md"
            }`}
          >
            {message.sender !== nickname && <p className="text-xs font-medium mb-1 opacity-80">{message.sender}</p>}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">📎</div>
              <p className="font-light">File attachment</p>
            </div>
            <p className="text-xs opacity-70 mt-2 font-light">{formatTime(message.timestamp)}</p>
          </div>
          {message.sender === nickname && message.sender !== "system" && (
            <button
              onClick={() => handleDeleteMessage(message.id)}
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full hover:scale-110 transform"
              title="Delete Message"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    }

    return null
  }
  const typingUsersArray = Array.from(typingUsers.values())
  const messageGroups = groupMessagesByDate()

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="bg-black p-4 border-b border-[#1a1a1a] flex justify-between items-center min-h-[72px]">
        <div className="flex items-center gap-3">
          {isMobileView && (
            <button
              onClick={onToggleLeftSidebar}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-white font-semibold shadow-lg">
            {roomData.roomName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <h2 className="font-semibold text-white text-lg tracking-tight">{roomData.roomName}</h2>
            <div className="text-xs text-gray-400 font-light flex items-center gap-2">
              <span>
                {roomData.participants.length}
                {roomData.participants.length === 1 ? " participant" : " participants"}
              </span>
              {isEncryptionReady && (
                <>
                  <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                  <span className="text-green-400">🔒 Encrypted</span>
                </>
              )}
            </div>
          </div>
        </div>
        {isMobileView && (
          <button
            onClick={onToggleRightSidebar}
            className="w-10 h-10 rounded-lg border border-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#FF4D00] hover:border-[#FF4D00]/30 transition-colors"
          >
            <Users size={18} />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-black scrollbar-thin scrollbar-thumb-[#1a1a1a] scrollbar-track-black">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messageGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-4">
              <div className="flex items-center justify-center my-6">
                <div className="bg-[#1a1a1a] text-gray-400 text-xs py-2 px-4 rounded-full border border-[#2a2a2a] animate-fade-in">
                  {group.date}
                </div>
              </div>
              {group.messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`group flex ${
                    msg.sender === nickname || msg.isLocal ? "justify-end" : "justify-start"
                  } ${msg.sender === "system" ? "justify-center" : ""}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {renderMessageContent(msg)}
                </div>
              ))}
            </div>
          ))}
          {typingUsersArray.length > 0 && (
            <div className="flex justify-start w-full max-w-4xl mx-auto">
              <div className="animate-bounce">
                <TypingIndicator typingUsers={typingUsersArray} />
              </div>
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
      />
    </div>
  )
}

export default ChatArea
