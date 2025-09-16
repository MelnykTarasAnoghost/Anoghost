"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { MessageExpiration } from "../../types/encryption"
import { Send, UserPlus, Smile } from "lucide-react"
import ExpirationSelector from "./ExpirationSelector"
import { FileUpload } from "./FileUpload"
import { useLastWall } from "@/contexts/LastWallContext"
import useLastWallEncryption from "@/hooks/chat/useLastWallEncryption"

interface MessageInputProps {
  onSendMessage: (message: string, expiration: MessageExpiration) => Promise<void>
  onFileUpload: (file: File) => Promise<void>
  onTyping?: (typing: boolean) => void
  isUploading: boolean
  uploadProgress: number
  isAloneInRoom: boolean
  isCreator: boolean
  disabled?: boolean
  roomId: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onFileUpload,
  onTyping,
  isUploading,
  uploadProgress,
  isAloneInRoom,
  isCreator,
  disabled = false,
  roomId,
}) => {
  const [newMessage, setNewMessage] = useState("")
  const [messageExpiration, setMessageExpiration] = useState<MessageExpiration>(MessageExpiration.NEVER)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const {wallKey} = useLastWall(roomId);
  const { encrypt } = useLastWallEncryption(wallKey||'');

  useEffect(() => {
    console.log("Current rooom id", roomId)
  }, [roomId])
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 120 // Maximum height in pixels
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [newMessage])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || disabled || isAloneInRoom) {
      return
    }

    console.log('wallKey',wallKey);

    let message = newMessage;
    

    if (wallKey){
      message = encrypt(newMessage)
    }

    console.log("Sending message", message)

    try {
      onTyping?.(false)
      await onSendMessage(message, messageExpiration)
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      await onFileUpload(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error uploading file:", error)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current
    const cursorPosition = textarea?.selectionStart || newMessage.length

    const newText = newMessage.slice(0, cursorPosition) + emoji + newMessage.slice(cursorPosition)
    setNewMessage(newText)
    setShowEmojiPicker(false)

    if (textarea) {
      textarea.focus()
      setTimeout(() => {
        textarea.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length)
      }, 0)
    }
  }

  const commonEmojis = ["😀", "😂", "😍", "🤔", "👍", "👎", "❤️", "🔥", "💯", "🎉", "😢", "😡", "🤷‍♂️", "🙄", "😎"]

  return (
    <div className="bg-black">
      {isUploading && (
        <div className="p-6">
          <div className="w-full bg-[#0f0f0f] rounded-full h-2">
            <div className="bg-[#FF4D00] h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-xs text-center mt-1 text-gray-400 font-light">Uploading: {uploadProgress}%</p>
        </div>
      )}

      {isAloneInRoom && (
        <div className="p-6 mx-4 mb-4 bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border border-[#2a2a2a] rounded-2xl text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FF4D00]/10 flex items-center justify-center">
              <UserPlus size={24} className="text-[#FF4D00]" />
            </div>
            <div>
              <p className="text-gray-300 text-sm font-medium mb-1">You're the only one in this room</p>
              <p className="text-xs text-gray-500">
                {isCreator
                  ? "Invite others to join before sending messages"
                  : "Wait for others to join before sending messages"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-[#1a1a1a]">
        <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-3 bottom-3 flex items-center z-10">
                <div className="relative mb-0.5" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-gray-400 hover:text-[#FF4D00] transition-colors p-1.5 rounded-full hover:bg-[#2a2a2a]"
                    disabled={disabled || isAloneInRoom}
                  >
                    <Smile size={18} />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 shadow-xl z-50 min-w-[200px]">
                      <div className="grid grid-cols-5 gap-1">
                        {commonEmojis.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleEmojiSelect(emoji)}
                            className="p-2 hover:bg-[#2a2a2a] rounded text-lg transition-colors transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => {
                    const text = e.target.value
                    setNewMessage(text)
                    if (text.trim() === "") {
                      onTyping?.(false) // stop typing immediately if empty
                    } else {
                      onTyping?.(true)
                    }
                }}
                placeholder={isAloneInRoom ? "Waiting for others to join..." : "Type your message..."}
                className="w-full p-3 pl-12 pr-20 rounded-2xl bg-[#1a1a1a] text-white border border-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/50 focus:border-[#FF4D00] transition-all font-light resize-none min-h-[3rem] max-h-[120px] placeholder:text-gray-500 scrollbar-hide overflow-y-auto"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
                disabled={disabled || isUploading || isAloneInRoom}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isAloneInRoom && !disabled) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
              />

              <div className="absolute right-3 bottom-3 mb-0.5 flex items-center space-x-2">
                <ExpirationSelector onSelect={setMessageExpiration} currentValue={messageExpiration} />
                <FileUpload
                  onFileSelect={handleFileUpload}
                  disabled={disabled || isUploading || isAloneInRoom}
                  ref={fileInputRef}
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold p-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[3rem] w-12 shadow-lg hover:shadow-xl disabled:hover:shadow-lg mb-1.5"
              disabled={!newMessage.trim() || disabled || isUploading || isAloneInRoom}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MessageInput
