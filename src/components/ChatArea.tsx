"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { getSocket, sendMessage, sharePublicKey, sendEncryptedMessage } from "../services/socket"
import {
  generateKeyPair,
  importPublicKey,
  decryptMessage,
  encryptGroupMessage,
  type KeyPair,
} from "../utils/encryption"
import type { EncryptedMessageData, PublicKeyData } from "../types/encryption"
import ExpirationSelector from "./ExpirationSelector"
import MessageExpirationIndicator from "./MessageExpirationIndicator"
import { MessageExpiration } from "../types/encryption"
import { Send, Users, Menu, MessageSquare, UserPlus } from "lucide-react"
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
  const { publicKey } = useWallet()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socket = getSocket()
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null)
  const [participantKeys, setParticipantKeys] = useState<Map<string, CryptoKey>>(new Map())
  const [encryptedMessages, setEncryptedMessages] = useState<Map<string, EncryptedMessageData>>(new Map())
  const [isEncryptionReady, setIsEncryptionReady] = useState(false)
  const [messageExpiration, setMessageExpiration] = useState<MessageExpiration>(MessageExpiration.NEVER)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [isMobileView, setIsMobileView] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check if there's only one participant (current user)
  const isAloneInRoom = roomData.participants.length <= 1

  // Call the useTypingStatus hook
  useTypingStatus(roomData.roomId, newMessage)

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [newMessage])

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
      // Skip messages from ourselves - we already added them locally
      if (data.sender === nickname) {
        return
      }

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
      // Add system message about user joining
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

    // Handle user leaving the room
    const handleUserLeft = (data: {
      nickname: string
      participants: Array<{ nickname: string; joinedAt: number }>
    }) => {
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
  }, [socket, roomData.roomName, keyPair, roomData.roomId, nickname])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket || !isEncryptionReady || !keyPair || isAloneInRoom) return

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
      const isOwnMessage = message.sender === nickname

      return (
        <div
          className={`p-3 rounded-lg ${
            isOwnMessage
              ? "bg-[#FF4D00] text-black rounded-br-none ml-auto min-w-[120px] max-w-[45%]"
              : "bg-[#1a1a1a] text-white rounded-bl-none min-w-[100px] max-w-[40%]"
          }`}
        >
          {!isOwnMessage && <p className="text-xs font-medium mb-1 opacity-80">{message.sender}</p>}
          <p className="font-light whitespace-pre-wrap break-words">{message.text}</p>
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
      const isOwnMessage = message.sender === nickname

      return (
        <div
          className={`p-3 rounded-lg ${
            isOwnMessage
              ? "bg-[#FF4D00] text-black rounded-br-none ml-auto min-w-[120px] max-w-[45%]"
              : "bg-[#1a1a1a] text-white rounded-bl-none min-w-[100px] max-w-[40%]"
          }`}
        >
          {!isOwnMessage && <p className="text-xs font-medium mb-1 opacity-80">{message.sender}</p>}
          <div className="flex items-center">
            <p className="font-light">File attachment</p>
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
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="bg-black p-4 border-b border-[#1a1a1a] flex justify-between items-center">
        <div className="flex items-center">
          {isMobileView && (
            <button onClick={onToggleLeftSidebar} className="mr-2 text-gray-400 hover:text-white">
              <Menu size={20} />
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-black font-medium mr-3">
            {roomData.roomName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-medium text-white text-lg tracking-tight">{roomData.roomName}</h2>
            <div className="text-xs text-gray-400 font-light">
              <span>
                {roomData.participants.length} {roomData.participants.length === 1 ? "participant" : "participants"}
              </span>
              {isEncryptionReady && <span className="ml-2">• Encrypted</span>}
            </div>
          </div>
        </div>
        {isMobileView && (
          <button
            onClick={onToggleRightSidebar}
            className="w-8 h-8 rounded-full border border-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#FF4D00] transition-colors"
          >
            <Users size={16} />
          </button>
        )}
      </div>

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

      {/* Alone in room message */}
      {isAloneInRoom && (
        <div className="p-4 bg-[#0f0f0f] border-t border-[#1a1a1a] text-center">
          <div className="flex flex-col items-center justify-center space-y-2">
            <UserPlus size={24} className="text-[#FF4D00]" />
            <p className="text-gray-400 text-sm">You're the only one in this room</p>
            <p className="text-xs text-gray-500">
              {isCreator
                ? "Invite others to join before sending messages"
                : "Wait for others to join before sending messages"}
            </p>
          </div>
        </div>
      )}

      {/* Message input area */}
      <div className="p-4 bg-black border-t border-[#1a1a1a]">
        <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-3 bottom-3 text-gray-400">
                <MessageSquare size={18} />
              </div>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isAloneInRoom ? "Waiting for others to join..." : "Type your message..."}
                className="w-full p-3 pl-10 rounded-lg bg-[#1a1a1a] text-white border-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00] transition-colors font-light resize-none min-h-[3rem] max-h-[150px]"
                disabled={isUploading || isAloneInRoom}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isAloneInRoom) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
              />
              <div className="absolute right-3 bottom-3 flex items-center space-x-2 text-gray-400">
                <ExpirationSelector onSelect={setMessageExpiration} currentValue={messageExpiration} />
              </div>
            </div>
            <button
              type="submit"
              className="bg-[#FF4D00] text-black font-medium p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-12 w-12"
              disabled={!newMessage.trim() || isUploading || isAloneInRoom}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatArea
