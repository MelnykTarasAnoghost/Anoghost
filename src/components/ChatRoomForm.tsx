"use client"

import type React from "react"
import { useState, useEffect } from "react"
import GenerateNftModal from "./GenerateNftModal"
import { PlusCircle } from "lucide-react"

interface ChatRoomFormProps {
  onSubmit: (formData: { roomName: string; nickname: string; isPrivate: boolean }) => void
  buttonText: string
  toggleText: string
  onToggle: () => void
  isLoading?: boolean
  initialNickname?: string
  showPrivateOption?: boolean
  onNftGenerated?: (nft: any) => void
}

const ChatRoomForm: React.FC<ChatRoomFormProps> = ({
  onSubmit,
  buttonText,
  toggleText,
  onToggle,
  isLoading = false,
  initialNickname = "",
  showPrivateOption = false,
  onNftGenerated = () => {},
}) => {
  const [roomName, setRoomName] = useState("")
  const [nickname, setNickname] = useState(initialNickname)
  const [isPrivate, setIsPrivate] = useState(false)
  const [isNftModalOpen, setIsNftModalOpen] = useState(false)

  useEffect(() => {
    if (initialNickname) {
      setNickname(initialNickname)
    }
  }, [initialNickname])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomName.trim() && nickname.trim()) {
      onSubmit({ roomName, nickname, isPrivate })
    }
  }

  const showDevTools = process.env.NODE_ENV !== "production"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="nickname" className="block text-sm mb-2 text-gray-400">
            Your Nickname
          </label>
          <div className="relative">
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              className="w-full p-3 pl-9 rounded-md bg-black text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
              required
              disabled={isLoading}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-1">This will be your anonymous identity in the chat</p>
        </div>

        <div>
          <label htmlFor="roomName" className="block text-sm mb-2 text-gray-400">
            Room Name
          </label>
          <div className="relative">
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter a name for your chat room"
              className="w-full p-3 pl-9 rounded-md bg-black text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
              required
              disabled={isLoading}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {showPrivateOption && (
          <div className="flex items-center border border-[#222222] p-3 rounded-md">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-[#FF4D00] focus:ring-[#FF4D00] border-[#333333] rounded bg-black"
              disabled={isLoading}
            />
            <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-400 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1 text-[#FF4D00]"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Private Room (requires approval to join)
            </label>
          </div>
        )}
      </div>

      {showDevTools && (
        <div className="border-t border-[#222222] pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-400 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-[#FF4D00]"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Development Tools
            </h3>
            <button
              type="button"
              onClick={() => setIsNftModalOpen(true)}
              className="flex items-center text-[#FF4D00] hover:text-[#FF6B33] text-sm bg-black py-2 px-3 rounded-md border border-[#333333]"
            >
              <PlusCircle size={14} className="mr-1" />
              Generate NFT
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Creating...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            {buttonText}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={onToggle}
        className="w-full text-[#FF4D00] hover:text-[#FF6B33] py-2 transition-colors flex items-center justify-center"
        disabled={isLoading}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        {toggleText}
      </button>

      <GenerateNftModal
        isOpen={isNftModalOpen}
        onClose={() => setIsNftModalOpen(false)}
        onNftGenerated={(nft) => {
          onNftGenerated(nft)
        }}
      />
    </form>
  )
}

export default ChatRoomForm
