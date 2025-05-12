"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { getSocket, sendMessage, sendLargeData, sharePublicKey, sendEncryptedMessage } from "../services/socket"
import { FileUpload } from "./FileUpload"
import ShareRoomModal from "./ShareRoomModal"
import {
  generateKeyPair,
  importPublicKey,
  decryptMessage,
  encryptGroupMessage,
  type KeyPair,
} from "../utils/encryption"
import type { EncryptedMessageData, PublicKeyData } from "../types/encryption"
import EncryptionStatus from "./EncryptionStatus"
import ExpirationSelector from "./ExpirationSelector"
import MessageExpirationIndicator from "./MessageExpirationIndicator"
import { MessageExpiration } from "../types/encryption"
import ParticipantsList from "./ParticipantsList"
import {
  Send,
  Users,
  Lock,
  Share2,
  Paperclip,
  ImageIcon,
  Smile,
  Mic,
  MoreVertical,
  ChevronLeft,
  Phone,
  Video,
} from "lucide-react"
import TypingIndicator from "./TypingIndicator"
import { useTypingStatus } from "../hooks/useTypingStatus"

// Update the Message interface to include expiration
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

interface ChatRoomProps {
  roomData: RoomData
  nickname: string
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomData, nickname }) => {
  const { publicKey } = useWallet()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [participants, setParticipants] = useState<Array<{ nickname: string; joinedAt: number }>>(roomData.participants)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socket = getSocket()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null)
  const [participantKeys, setParticipantKeys] = useState<Map<string, CryptoKey>>(new Map())
  const [encryptedMessages, setEncryptedMessages] = useState<Map<string, EncryptedMessageData>>(new Map())
  const [isEncryptionReady, setIsEncryptionReady] = useState(false)
  const [messageExpiration, setMessageExpiration] = useState<MessageExpiration>(MessageExpiration.NEVER)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [showSecurityPanel, setShowSecurityPanel] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)

  // Call the useTypingStatus hook
  useTypingStatus(roomData.roomId, newMessage)

  // Check for mobile view
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize encryption when joining a room
  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        // Generate a key pair for this user
        const newKeyPair = await generateKeyPair()
        setKeyPair(newKeyPair)

        // Share public key with other participants
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

    const handleTypingStatus = (data: { userId: string; nickname: string; isTyping: boolean }) => {
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

  // Set up socket event listeners for the chat room
  useEffect(() => {
    if (!socket) return

    // Add welcome message
    setMessages([
      {
        id: "welcome",
        sender: "system",
        text: `Welcome to ${roomData.roomName}! Your messages are anonymous and end-to-end encrypted.`,
        timestamp: Date.now(),
      },
    ])

    // Handle incoming text messages
    const handleIncomingMessage = (data: {
      id: string
      sender: string
      text: string
      type?: string
      timestamp: number
      expiresAt?: number
    }) => {
      setMessages((prev) => [...prev, data])
    }

    // Handle incoming large messages (files, etc)
    const handleLargeMessage = (data: {
      id: string
      sender: string
      data: ArrayBuffer
      timestamp: number
    }) => {
      setMessages((prev) => [...prev, data])
    }

    // Handle user joining the room
    const handleUserJoined = (data: {
      nickname: string
      participants: Array<{ nickname: string; joinedAt: number }>
    }) => {
      setParticipants(data.participants)

      // Add system message about user joining
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "system",
          text: `${data.nickname} joined the room`,
          timestamp: Date.now(),
        },
      ])
    }

    // Handle user leaving the room
    const handleUserLeft = (data: {
      nickname: string
      participants: Array<{ nickname: string; joinedAt: number }>
    }) => {
      setParticipants(data.participants)

      // Add system message about user leaving
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

    // Handle public key shared by another participant
    const handlePublicKeyShared = async (data: PublicKeyData) => {
      try {
        const { userId, publicKeyJwk } = data

        // Import the public key
        const publicKey = await importPublicKey(publicKeyJwk)

        // Store the public key
        setParticipantKeys((prev) => {
          const newMap = new Map(prev)
          newMap.set(userId, publicKey)
          return newMap
        })
      } catch (error) {
        console.error("Error handling shared public key:", error)
      }
    }

    // Handle encrypted message
    const handleEncryptedMessage = async (data: EncryptedMessageData) => {
      try {
        // Store the encrypted message
        setEncryptedMessages((prev) => {
          const newMap = new Map(prev)
          newMap.set(data.id, data)
          return newMap
        })

        // Check if this is our own message (from our socket ID)
        if (socket && data.senderId === socket.id) {
          // Skip processing our own messages as we've already added them to the UI
          return
        }

        // Decrypt the message if we have the private key
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

          // Add the decrypted message to the messages list
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

    // Handle public key request
    const handlePublicKeyRequested = async (data: { requesterId: string }) => {
      try {
        if (keyPair) {
          await sharePublicKey(roomData.roomId, keyPair.publicKeyJwk)
        }
      } catch (error) {
        console.error("Error handling public key request:", error)
      }
    }

    // Handle message expiration
    const handleMessageExpired = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId))
    }

    const handleTypingStatus = (data: { userId: string; nickname: string; isTyping: boolean }) => {
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

    socket.on("message", handleIncomingMessage)
    socket.on("largeMessage", handleLargeMessage)
    socket.on("userJoinedRoom", handleUserJoined)
    socket.on("userLeftRoom", handleUserLeft)
    socket.on("publicKeyShared", handlePublicKeyShared)
    socket.on("encryptedMessage", handleEncryptedMessage)
    socket.on("publicKeyRequested", handlePublicKeyRequested)
    socket.on("requestPublicKey", handlePublicKeyRequested)
    socket.on("messageExpired", handleMessageExpired)
    socket.on("userTypingStatus", handleTypingStatus)

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
      socket.off("userTypingStatus", handleTypingStatus)
    }
  }, [socket, roomData.roomName, keyPair, roomData.roomId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket || !isEncryptionReady || !keyPair) return

    try {
      // Create a message ID locally to track our own messages
      const localMessageId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      // Calculate expiration time if set
      const expiresAt = messageExpiration !== MessageExpiration.NEVER ? Date.now() + messageExpiration : undefined

      // Add message to local state immediately (only for the sender)
      setMessages((prev) => [
        ...prev,
        {
          id: localMessageId,
          sender: nickname,
          text: newMessage,
          timestamp: Date.now(),
          isLocal: true, // Mark as local to avoid duplication
          expiresAt, // Include expiration time
        },
      ])

      // If we have participant keys, encrypt the message for each participant
      if (participantKeys.size > 0) {
        // Add our own key to encrypt for ourselves too
        const allKeys = new Map(participantKeys)
        if (keyPair) {
          allKeys.set(socket.id, keyPair.publicKey)
        }

        // Encrypt the message for all participants
        const encryptedMessages = await encryptGroupMessage(newMessage, allKeys)

        // Convert to a regular object for transmission
        const encryptedMessagesObj: Record<string, any> = {}
        for (const [recipientId, encryptedMsg] of encryptedMessages.entries()) {
          encryptedMessagesObj[recipientId] = {
            iv: encryptedMsg.iv,
            encryptedContent: encryptedMsg.encryptedContent,
            encryptedKey: encryptedMsg.encryptedKey,
          }
        }

        // Send the encrypted messages with expiration
        const result = await sendEncryptedMessage(encryptedMessagesObj, expiresAt)

        if (!result.success) {
          console.error("Error sending encrypted message:", result.error)
        }
      } else {
        // Fallback to unencrypted message if no participant keys available
        const result = await sendMessage(newMessage, expiresAt)

        if (!result.success) {
          console.error("Error sending message:", result.error)
        }
      }

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Add a handler for message expiration
  const handleMessageExpired = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
  }

  const handleFileUpload = async (file: File) => {
    if (!socket) return

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Determine file type
      const fileType = file.type || "application/octet-stream"

      // Send the file
      const result = await sendLargeData(file, fileType, (progress) => setUploadProgress(progress))

      if (!result.success) {
        console.error("Error uploading file:", result.error)
      }
    } catch (error) {
      console.error("Error uploading file:", error)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Format timestamp to readable time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Format date for message groups
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
      return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    }
  }

  // Group messages by date
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
        <div className="bg-[#0f0f0f] text-gray-400 text-xs py-1 px-3 rounded-full border border-[#1a1a1a] mx-auto my-2 flex items-center">
          {message.text}
        </div>
      )
    }

    if (message.text) {
      return (
        <div
          className={`max-w-[80%] p-3 rounded-lg ${
            message.sender === nickname
              ? "bg-[#FF4D00] text-black rounded-br-none ml-auto"
              : "bg-[#1a1a1a] text-white rounded-bl-none"
          }`}
        >
          {message.sender !== nickname && <p className="text-xs font-medium mb-1 opacity-80">{message.sender}</p>}
          <p className="font-light">{message.text}</p>
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs opacity-70 font-light">{formatTime(message.timestamp)}</p>
            {message.expiresAt && (
              <MessageExpirationIndicator
                expiresAt={message.expiresAt}
                onExpired={() => handleMessageExpired(message.id)}
              />
            )}
          </div>
        </div>
      )
    }

    if (message.data) {
      return (
        <div
          className={`max-w-[80%] p-3 rounded-lg ${
            message.sender === nickname
              ? "bg-[#FF4D00] text-black rounded-br-none ml-auto"
              : "bg-[#1a1a1a] text-white rounded-bl-none"
          }`}
        >
          {message.sender !== nickname && <p className="text-xs font-medium mb-1 opacity-80">{message.sender}</p>}
          <div className="flex items-center">
            <Paperclip size={14} className="mr-1" />
            <p className="font-light">Sent a file</p>
          </div>
          <p className="text-xs opacity-70 mt-1 font-light">{formatTime(message.timestamp)}</p>
        </div>
      )
    }

    return null
  }

  const typingUsersArray = Array.from(typingUsers.values())
  const messageGroups = groupMessagesByDate()

  return (
    <div className="flex flex-col h-[700px] bg-black rounded-lg overflow-hidden border border-[#1a1a1a] w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-black p-4 border-b border-[#1a1a1a] flex justify-between items-center">
        <div className="flex items-center">
          {isMobileView && (
            <button className="mr-2 text-gray-400 hover:text-white">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-black font-medium mr-3">
            {roomData.roomName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-medium text-white text-lg tracking-tight">{roomData.roomName}</h2>
            <div className="flex items-center text-xs text-gray-400 font-light">
              <div className="flex items-center mr-3">
                <Users size={12} className="mr-1" />
                {participants.length} {participants.length === 1 ? "participant" : "participants"}
              </div>
              {isEncryptionReady && (
                <div className="flex items-center">
                  <Lock size={12} className="mr-1" />
                  Encrypted
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="w-8 h-8 rounded-full border border-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#FF4D00] transition-colors">
            <Phone size={16} />
          </button>
          <button className="w-8 h-8 rounded-full border border-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#FF4D00] transition-colors">
            <Video size={16} />
          </button>
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`w-8 h-8 rounded-full ${
              showParticipants ? "bg-[#FF4D00]" : "border border-[#1a1a1a]"
            } flex items-center justify-center ${
              showParticipants ? "text-black" : "text-gray-400 hover:text-[#FF4D00]"
            } transition-colors`}
          >
            <Users size={16} />
          </button>
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="w-8 h-8 rounded-full border border-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#FF4D00] transition-colors"
          >
            <Share2 size={16} />
          </button>
          <button className="w-8 h-8 rounded-full border border-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#FF4D00] transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Main content area with messages and optional participants sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black scrollbar-thin scrollbar-thumb-[#1a1a1a] scrollbar-track-black">
          {messageGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <div className="flex items-center justify-center my-4">
                <div className="bg-[#1a1a1a] text-gray-400 text-xs py-1 px-3 rounded-full">{group.date}</div>
              </div>

              {group.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "system" ? "items-center" : "items-stretch"}`}
                >
                  {renderMessageContent(msg)}
                </div>
              ))}
            </div>
          ))}

          {typingUsersArray.length > 0 && (
            <div className="flex justify-start w-full">
              <TypingIndicator typingUsers={typingUsersArray} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Participants sidebar (conditionally rendered) */}
        {showParticipants && (
          <div className="w-80 bg-black border-l border-[#1a1a1a] overflow-y-auto">
            <ParticipantsList participants={participants} />
          </div>
        )}
      </div>

      {/* Upload progress bar */}
      {isUploading && (
        <div className="p-2 bg-black">
          <div className="w-full bg-[#0f0f0f] rounded-full h-1">
            <div className="bg-[#FF4D00] h-1 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p className="text-xs text-center mt-1 text-gray-400 font-light">Uploading: {uploadProgress}%</p>
        </div>
      )}

      {/* Message input area */}
      <div className="p-4 bg-black border-t border-[#1a1a1a]">
        <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <div className="absolute bottom-full mb-2 flex space-x-2 px-2">
                <button type="button" className="text-gray-400 hover:text-[#FF4D00] transition-colors">
                  <ImageIcon size={18} />
                </button>
                <button type="button" className="text-gray-400 hover:text-[#FF4D00] transition-colors">
                  <Mic size={18} />
                </button>
                <button type="button" className="text-gray-400 hover:text-[#FF4D00] transition-colors">
                  <Smile size={18} />
                </button>
                <ExpirationSelector onSelect={setMessageExpiration} currentValue={messageExpiration} />
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full p-3 rounded-lg bg-[#1a1a1a] text-white border-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00] transition-colors font-light resize-none h-12 min-h-[3rem] max-h-32"
                disabled={isUploading}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
              />
              <div className="absolute right-3 bottom-3 flex items-center space-x-2 text-gray-400">
                <FileUpload onFileSelect={handleFileUpload} disabled={isUploading} ref={fileInputRef} />
              </div>
            </div>
            <button
              type="submit"
              className="bg-[#FF4D00] text-black font-medium p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-12 w-12"
              disabled={!newMessage.trim() || isUploading}
            >
              <Send size={18} />
            </button>
          </div>

          <div className="flex justify-between items-center px-2">
            <div className="flex items-center">
              <EncryptionStatus
                isEncryptionReady={isEncryptionReady}
                participantCount={participants.length}
                encryptedParticipantCount={participantKeys.size}
              />
            </div>
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-black text-xs mr-2">
                {nickname.charAt(0).toUpperCase()}
              </div>
              <p className="text-xs text-gray-400 font-light">
                <span className="text-[#FF4D00]">{nickname}</span>
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Share modal */}
      {roomData.accessToken && (
        <ShareRoomModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          roomId={roomData.roomId}
          roomName={roomData.roomName}
          accessToken={roomData.accessToken}
        />
      )}
    </div>
  )
}

export default ChatRoom
