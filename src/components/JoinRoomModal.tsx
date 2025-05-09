"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { requestJoinRoom } from "../services/socket"
import { Copy, Ghost, Key, X, ArrowRight } from "lucide-react"

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onJoinSuccess: (roomData: any) => void
  onJoinPending: (roomInfo: { roomId: string; roomName: string }) => void
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onJoinSuccess, onJoinPending }) => {
  const [roomId, setRoomId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && !isLoading) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose, isLoading])

  // Handle escape key to close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey)
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [isOpen, onClose, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!roomId.trim()) {
      setError("Please enter a room ID")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Request to join the room
      const result = await requestJoinRoom(roomId.trim(), accessToken.trim() || undefined)

      if (result.success) {
        if (result.status === "joined" && result.roomData) {
          // Joined immediately
          onJoinSuccess(result.roomData)
        } else if (result.status === "pending" && result.roomData) {
          // Join request is pending approval
          onJoinPending({
            roomId: result.roomData.roomId,
            roomName: result.roomData.roomName,
          })
        }
        onClose()
      } else {
        setError(result.error || "Failed to join room")
      }
    } catch (error) {
      console.error("Error joining room:", error)
      setError("Failed to join room. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-black rounded-xl w-full max-w-md p-6 border border-[#333333]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium flex items-center tracking-tight">
            <Ghost size={20} className="mr-2 text-[#FF4D00]" />
            Join Chat Room
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222222] hover:border-[#FF4D00] hover:text-[#FF4D00]"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-md text-[#FF4D00] text-sm flex items-start">
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
              className="mr-2 mt-0.5 flex-shrink-0"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="roomId" className="block text-sm mb-2 text-gray-300 flex items-center tracking-tight">
              <Copy size={14} className="mr-1 text-[#FF4D00]" />
              Room ID <span className="text-[#FF4D00] ml-1">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Paste room ID here"
                className="w-full p-3 pl-9 rounded-lg bg-black text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
                disabled={isLoading}
                required
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
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
                >
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-1">Enter the room ID shared with you</p>
            </div>
          </div>

          <div>
            <label htmlFor="accessToken" className="block text-sm mb-2 text-gray-300 flex items-center tracking-tight">
              <Key size={14} className="mr-1 text-[#FF4D00]" />
              Access Token (Optional)
            </label>
            <div className="relative">
              <input
                id="accessToken"
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter access token if provided"
                className="w-full p-3 pl-9 rounded-lg bg-black text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
                disabled={isLoading}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
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
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-1">Required for some private rooms</p>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-[#111111] hover:bg-[#222222] text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none disabled:opacity-50 border border-[#222222] hover:border-[#333333]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !roomId.trim()}
              className="flex-1 bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Joining...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Join Room
                  <ArrowRight size={16} className="ml-2" />
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JoinRoomModal
