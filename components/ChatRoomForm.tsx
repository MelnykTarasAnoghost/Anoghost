"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowRight, ArrowLeft, Plus, Loader2, Lock, CheckCircle } from "lucide-react"
import GhostIdInput from "./GhostIdInput"

interface ChatRoomFormProps {
  onSubmit: (formData: {
    roomName: string
    nickname: string
    isPrivate: boolean
    ghostIds: string[]
  }) => void
  buttonText: string
  toggleText: string
  onToggle: () => void
  isLoading?: boolean
  initialNickname?: string
  showPrivateOption?: boolean
}

const ChatRoomForm: React.FC<ChatRoomFormProps> = ({
  onSubmit,
  buttonText,
  toggleText,
  onToggle,
  isLoading = false,
  initialNickname = "",
  showPrivateOption = false,
}) => {
  // Form data
  const [roomName, setRoomName] = useState("")
  const [nickname, setNickname] = useState(initialNickname)
  const [isPrivate, setIsPrivate] = useState(false)
  const [ghostIds, setGhostIds] = useState<string[]>([""])

  // Form stage
  const [currentStage, setCurrentStage] = useState(1)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Pricing
  const BASE_PRICE = 0.01 // SOL
  const PRICE_PER_NFT = 0.005 // SOL

  useEffect(() => {
    if (initialNickname) {
      setNickname(initialNickname)
    }
  }, [initialNickname])

  const validateStage = (stage: number): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (stage === 1) {
      if (!roomName.trim()) {
        newErrors.roomName = "Room name is required"
      }
      if (!nickname.trim()) {
        newErrors.nickname = "Nickname is required"
      }
    }

    if (stage === 2) {
      const validGhostIds = ghostIds.filter((id) => id.trim() !== "")
      if (validGhostIds.length === 0) {
        newErrors.ghostIds = "At least one GhostID is required"
      }
      // Note: We don't validate GhostID format here as that's handled by the GhostIdInput component
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Modified nextStage function to skip Stage 2 if room is not private
  const nextStage = () => {
    if (validateStage(currentStage)) {
      if (currentStage === 1 && !isPrivate) {
        // Skip Stage 2 (GhostIDs) if room is not private
        setCurrentStage(3)
      } else {
        setCurrentStage((prev) => prev + 1)
      }
    }
  }

  // Modified prevStage function to handle going back correctly
  const prevStage = () => {
    if (currentStage === 3 && !isPrivate) {
      // Go back to Stage 1 if room is not private
      setCurrentStage(1)
    } else {
      setCurrentStage((prev) => Math.max(1, prev - 1))
    }
  }

  const addGhostId = () => {
    setGhostIds([...ghostIds, ""])
  }

  const removeGhostId = (index: number) => {
    const newIds = [...ghostIds]
    newIds.splice(index, 1)
    if (newIds.length === 0) {
      newIds.push("")
    }
    setGhostIds(newIds)
  }

  const updateGhostId = (index: number, value: string) => {
    const newIds = [...ghostIds]
    newIds[index] = value
    setGhostIds(newIds)

    // Clear error for this field if it exists
    if (errors[`ghost_${index}`]) {
      const newErrors = { ...errors }
      delete newErrors[`ghost_${index}`]
      setErrors(newErrors)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateStage(currentStage)) {
      // For non-private rooms, we don't need GhostIDs
      const validGhostIds = isPrivate ? ghostIds.filter((id) => id.trim() !== "") : []
      onSubmit({
        roomName,
        nickname,
        isPrivate,
        ghostIds: validGhostIds,
      })
    }
  }

  const calculateTotalPrice = () => {
    // For non-private rooms, we don't need to calculate NFT costs
    const validGhostIds = isPrivate ? ghostIds.filter((id) => id.trim() !== "") : []
    return BASE_PRICE + validGhostIds.length * PRICE_PER_NFT
  }

  // Render different stages
  const renderStage1 = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4">
        <div>
          <label htmlFor="nickname" className="block text-sm mb-1.5 text-gray-400">
            Your Nickname
          </label>
          <div className="relative">
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                if (errors.nickname) {
                  const newErrors = { ...errors }
                  delete newErrors.nickname
                  setErrors(newErrors)
                }
              }}
              placeholder="Enter your nickname"
              className={`w-full p-3 pl-9 rounded-xl bg-black text-white border ${errors.nickname ? "border-red-500" : "border-[#333333]"} focus:outline-none focus:border-[#FF4D00] transition-colors`}
              disabled={isLoading}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
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
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
          {errors.nickname && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.nickname}</p>}
          <p className="text-xs text-gray-500 mt-1.5 ml-1">This will be your anonymous identity in the chat</p>
        </div>

        <div>
          <label htmlFor="roomName" className="block text-sm mb-1.5 text-gray-400">
            Room Name
          </label>
          <div className="relative">
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value)
                if (errors.roomName) {
                  const newErrors = { ...errors }
                  delete newErrors.roomName
                  setErrors(newErrors)
                }
              }}
              placeholder="Enter a name for your chat room"
              className={`w-full p-3 pl-9 rounded-xl bg-black text-white border ${errors.roomName ? "border-red-500" : "border-[#333333]"} focus:outline-none focus:border-[#FF4D00] transition-colors`}
              disabled={isLoading}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
          {errors.roomName && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.roomName}</p>}
        </div>

        {showPrivateOption && (
          <div className="flex items-center border border-[#222222] p-3 rounded-xl">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-[#FF4D00] focus:ring-[#FF4D00] border-[#333333] rounded bg-black"
              disabled={isLoading}
            />
            <label htmlFor="isPrivate" className="ml-2.5 block text-sm text-gray-400 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1.5 text-[#FF4D00]"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Private Room (requires approval to join)
            </label>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <button
          type="button"
          onClick={nextStage}
          className="w-full bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
          disabled={isLoading}
        >
          Next Step
          <ArrowRight size={15} className="ml-2" />
        </button>
      </div>
    </div>
  )

  const renderStage2 = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm text-gray-400">GhostIDs for NFT Access</label>
            <button
              type="button"
              onClick={addGhostId}
              className="text-xs flex items-center text-[#FF4D00] hover:text-[#FF6B33]"
            >
              <Plus size={13} className="mr-1.5" />
              Add GhostID
            </button>
          </div>

          <div className="flex items-center mb-2.5">
            <Lock size={13} className="text-[#FF4D00] mr-1.5" />
            <p className="text-xs text-gray-400">GhostIDs are encrypted identifiers for secure access</p>
          </div>

          {errors.ghostIds && (
            <div className="mb-2.5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-xs text-red-500">{errors.ghostIds}</p>
            </div>
          )}

          <div className="space-y-2.5 max-h-[150px] overflow-y-auto pr-1 border border-[#222222] rounded-xl p-3">
            {ghostIds.map((id, index) => (
              <GhostIdInput
                key={index}
                value={id}
                index={index}
                onChange={(value) => updateGhostId(index, value)}
                onRemove={() => removeGhostId(index)}
                showRemoveButton={ghostIds.length > 1}
                disabled={isLoading}
                error={errors[`ghost_${index}`]}
              />
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-1.5 ml-1">
            Each GhostID will receive an NFT access pass to this chat room
          </p>
        </div>
      </div>

      <div className="mt-auto flex space-x-4">
        <button
          type="button"
          onClick={prevStage}
          className="flex-1 bg-[#222222] text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
          disabled={isLoading}
        >
          <ArrowLeft size={15} className="mr-1.5" />
          Back
        </button>

        <button
          type="button"
          onClick={nextStage}
          className="flex-1 bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
          disabled={isLoading}
        >
          Next Step
          <ArrowRight size={15} className="ml-1.5" />
        </button>
      </div>
    </div>
  )

  const renderStage3 = () => {
    const validGhostIds = isPrivate ? ghostIds.filter((id) => id.trim() !== "") : []
    const totalPrice = calculateTotalPrice()

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="border border-[#222222] rounded-xl p-4 mb-4">
            <h3 className="text-sm font-medium mb-2.5">Room Summary</h3>

            <div className="space-y-1.5 mb-3.5">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Room Name:</span>
                <span className="text-xs font-medium">{roomName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Your Nickname:</span>
                <span className="text-xs font-medium">{nickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Room Type:</span>
                <span className="text-xs font-medium">{isPrivate ? "Private" : "Public"}</span>
              </div>
              {isPrivate && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">NFT Access Passes:</span>
                  <span className="text-xs font-medium">{validGhostIds.length}</span>
                </div>
              )}
            </div>

            {isPrivate && validGhostIds.length > 0 && (
              <div className="border-t border-[#222222] pt-2.5 mb-2.5">
                <h4 className="text-xs font-medium mb-1.5">GhostID Recipients:</h4>
                <div className="max-h-[80px] overflow-y-auto border border-[#222222] rounded-xl p-2">
                  {validGhostIds.map((id, index) => (
                    <div key={index} className="flex items-center mb-1.5">
                      <CheckCircle size={11} className="text-green-500 mr-1.5 flex-shrink-0" />
                      <span className="text-xs font-mono truncate">{id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-[#222222] pt-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Base Price:</span>
                <span className="text-xs font-medium">{BASE_PRICE} SOL</span>
              </div>
              {isPrivate && validGhostIds.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    NFT Access Passes ({validGhostIds.length} × {PRICE_PER_NFT} SOL):
                  </span>
                  <span className="text-xs font-medium">{(validGhostIds.length * PRICE_PER_NFT).toFixed(3)} SOL</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-[#222222]">
                <span className="text-xs font-medium">Total:</span>
                <span className="text-xs font-bold text-[#FF4D00]">{totalPrice.toFixed(3)} SOL</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-4 mt-auto">
          <button
            type="button"
            onClick={prevStage}
            className="flex-1 bg-[#222222] text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
            disabled={isLoading}
          >
            <ArrowLeft size={15} className="mr-1.5" />
            Back
          </button>

          <button
            type="submit"
            className="flex-1 bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="mr-1.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>{buttonText}</>
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStage >= 1 ? "bg-[#FF4D00] text-black" : "bg-[#222222] text-gray-400"}`}
          >
            1
          </div>
          <div className={`h-0.5 w-5 ${currentStage >= 2 ? "bg-[#FF4D00]" : "bg-[#222222]"}`}></div>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStage >= 2 ? "bg-[#FF4D00] text-black" : "bg-[#222222] text-gray-400"}`}
          >
            2
          </div>
          <div className={`h-0.5 w-5 ${currentStage >= 3 ? "bg-[#FF4D00]" : "bg-[#222222]"}`}></div>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStage >= 3 ? "bg-[#FF4D00] text-black" : "bg-[#222222] text-gray-400"}`}
          >
            3
          </div>
        </div>
        <div className="text-xs text-gray-400">Step {currentStage} of 3</div>
      </div>

      {/* Stage title */}
      <div className="mb-4">
        <h2 className="text-base font-medium">
          {currentStage === 1 && "Room Details"}
          {currentStage === 2 && "Access Permissions"}
          {currentStage === 3 && "Review & Create"}
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {currentStage === 1 && "Enter basic information about your chat room"}
          {currentStage === 2 && "Add GhostIDs that will receive NFT access passes"}
          {currentStage === 3 && "Review details and create your encrypted chat room"}
        </p>
      </div>

      {/* Stage content - fixed height container with responsive adjustments */}
      <div className="h-[320px] flex flex-col overflow-hidden">
        {currentStage === 1 && renderStage1()}
        {currentStage === 2 && renderStage2()}
        {currentStage === 3 && renderStage3()}
      </div>

      {/* Toggle link */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-[#FF4D00] hover:text-[#FF6B33] py-1.5 transition-colors flex items-center justify-center text-sm"
        disabled={isLoading}
      >
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
          className="mr-1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        {toggleText}
      </button>
    </form>
  )
}

export default ChatRoomForm
