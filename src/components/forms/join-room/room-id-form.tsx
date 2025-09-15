"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Copy, ArrowRight, Loader2, User } from "lucide-react"

interface RoomIdFormProps {
  nicknameInput: string
  onNicknameChange: (nickname: string) => void
  onSubmit: (roomId: string, nickname: string) => Promise<void>
  onCancel: () => void
  isLoading: boolean
}

const RoomIdForm: React.FC<RoomIdFormProps> = ({ nicknameInput, onNicknameChange, onSubmit, onCancel, isLoading }) => {
  const [roomIdInput, setRoomIdInput] = useState("")
  const roomIdInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (roomIdInputRef.current) {
      setTimeout(() => roomIdInputRef.current?.focus(), 100)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const currentNickname = nicknameInput.trim() || `Anonymous-${Math.floor(Math.random() * 10000)}`
    await onSubmit(roomIdInput.trim(), currentNickname)
  }

  return (
    <>
      <div className="mb-4">
        <label htmlFor="nicknameInput" className="text-sm mb-1.5 text-gray-400 flex items-center tracking-tight">
          <User size={15} className="mr-1.5 text-[#FF4D00]" /> Your Nickname <span className="text-[#FF4D00] ml-1">*</span>
        </label>
        <div className="relative group">
          <input
            id="nicknameInput"
            type="text"
            value={nicknameInput}
            onChange={(e) => onNicknameChange(e.target.value)}
            placeholder="Enter your nickname"
            className="w-full p-3.5 pl-10 rounded-xl bg-black text-white border transition-all duration-300 ease-in-out border-[#333333] group-hover:border-[#444444] focus:outline-none focus:border-[#FF4D00] focus:shadow-lg focus:shadow-[#FF4D00]/20"
            disabled={isLoading}
            required
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="roomIdInput" className="text-sm mb-1.5 text-gray-400 flex items-center tracking-tight">
            <Copy size={15} className="mr-1.5 text-[#FF4D00]" /> Room ID <span className="text-[#FF4D00] ml-1">*</span>
          </label>
          <div className="relative group">
            <input
              ref={roomIdInputRef}
              id="roomIdInput"
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              placeholder="Paste room ID here"
              className="w-full p-3.5 pl-10 rounded-xl bg-black text-white border transition-all duration-300 ease-in-out border-[#333333] group-hover:border-[#444444] focus:outline-none focus:border-[#FF4D00] focus:shadow-lg focus:shadow-[#FF4D00]/20"
              disabled={isLoading}
              required
            />
            <div className="absolute left-3.5 top-1/2 transform -translate-y-[115%] text-gray-500 transition-colors duration-200 group-focus-within:text-[#FF4D00]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 ml-1.5 transition-colors duration-200">Enter the room ID shared with you</p>
          </div>
        </div>

        <div className="flex space-x-4 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-[#111111] hover:bg-[#222222] text-white font-medium py-3.5 px-4 rounded-xl transition-colors focus:outline-none disabled:opacity-50 border border-[#222222] hover:border-[#333333]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !roomIdInput.trim() || !nicknameInput.trim()}
            className="flex-1 bg-[#FF4D00] text-black font-medium py-3.5 px-4 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Room <ArrowRight size={16} className="ml-2" />
              </>
            )}
          </button>
        </div>
      </form>
    </>
  )
}

export default RoomIdForm