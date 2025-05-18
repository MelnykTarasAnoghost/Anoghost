"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, UserPlus, Copy, Check, ArrowRight, ArrowLeft, Plus, Loader2 } from "lucide-react"
import PendingRequests from "./PendingRequests"
import GhostIdInput from "./GhostIdInput"

interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  isPrivate?: boolean
}

interface RightSidebarProps {
  roomData: RoomData
  participants: Array<{ nickname: string; joinedAt: number }>
  pendingParticipants: Array<{ id: string; nickname: string; requestedAt: number }>
  isCreator: boolean
  onClose: () => void
  onNftGenerated: (nft: any) => void
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  roomData,
  participants,
  pendingParticipants,
  isCreator,
  onClose,
}) => {
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [ghostIds, setGhostIds] = useState<string[]>([""])
  const [currentStep, setCurrentStep] = useState(1)
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [participantsList, setParticipantsList] = useState<Array<{ nickname: string; joinedAt: number }>>(participants)

  // Update local state when participants prop changes
  useEffect(() => {
    setParticipantsList(participants)
  }, [participants])

  // Pricing constants
  const BASE_PRICE = 0.01 // SOL
  const PRICE_PER_NFT = 0.005 // SOL

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomData.roomId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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

  const validateGhostIds = () => {
    const newErrors: { [key: string]: string } = {}
    const validGhostIds = ghostIds.filter((id) => id.trim() !== "")

    if (validGhostIds.length === 0) {
      newErrors.ghostIds = "At least one GhostID is required"
    }
    // Note: We don't validate GhostID format here as that's handled by the GhostIdInput component

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateGhostIds()) {
      setCurrentStep(2)
    }
  }

  const handleBack = () => {
    setCurrentStep(1)
  }

  const handleSubmit = async () => {
    if (!validateGhostIds()) return

    setIsProcessing(true)

    try {
      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Close the modal after successful processing
      setShowAddParticipantModal(false)
      setCurrentStep(1)
      setGhostIds([""]) // Reset for next time
    } catch (error) {
      console.error("Error processing GhostIDs:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const calculateTotalPrice = () => {
    const validGhostIds = ghostIds.filter((id) => id.trim() !== "")
    return BASE_PRICE + validGhostIds.length * PRICE_PER_NFT
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="font-medium text-white">Participants</h2>
        </div>
        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Pending Requests Section */}
          {isCreator && pendingParticipants.length > 0 && (
            <PendingRequests roomId={roomData.roomId} pendingParticipants={pendingParticipants} />
          )}

          {/* Participants Section */}
          <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
            <div className="p-3 bg-[#1a1a1a] flex justify-between items-center">
              <h3 className="text-sm font-medium text-white">Participants ({participantsList.length})</h3>
              {isCreator && (
                <button
                  onClick={() => setShowAddParticipantModal(true)}
                  className="text-[#FF4D00] hover:text-[#FF7E45] transition-colors"
                >
                  <UserPlus size={16} />
                </button>
              )}
            </div>

            <div className="p-4">
              <div className="space-y-3">
                {participantsList.map((participant, index) => (
                  <div
                    key={`${participant.nickname}-${participant.joinedAt}`}
                    className="flex items-center p-2 rounded-md hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-black font-medium mr-3">
                      {participant.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{participant.nickname}</p>
                    </div>
                    {index === 0 && (
                      <div className="ml-2 px-2 py-0.5 bg-[#1a1a1a] rounded text-xs text-[#FF4D00]">Creator</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Participant Modal */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-2xl w-full max-w-md p-6 border border-[#333333]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium flex items-center tracking-tight">
                <UserPlus size={20} className="mr-2 text-[#FF4D00]" />
                Add Participants
              </h2>
              <button
                onClick={() => {
                  setShowAddParticipantModal(false)
                  setCurrentStep(1)
                  setGhostIds([""])
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222222]"
              >
                <X size={16} />
              </button>
            </div>

            {roomData.isPrivate ? (
              // Private room - show GhostID fields and fee summary
              <>
                {currentStep === 1 ? (
                  <div className="space-y-4">
                    <p className="text-gray-300 mb-3">
                      Add GhostIDs to grant access to this private room. Each GhostID will receive an NFT access pass.
                    </p>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm text-gray-400">GhostIDs for NFT Access</label>
                        <button
                          type="button"
                          onClick={addGhostId}
                          className="text-xs flex items-center text-[#FF4D00] hover:text-[#FF6B33]"
                        >
                          <Plus size={12} className="mr-1" />
                          Add GhostID
                        </button>
                      </div>

                      {errors.ghostIds && (
                        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <p className="text-xs text-red-500">{errors.ghostIds}</p>
                        </div>
                      )}

                      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 border border-[#222222] rounded-xl p-3">
                        {ghostIds.map((id, index) => (
                          <GhostIdInput
                            key={index}
                            value={id}
                            index={index}
                            onChange={(value) => updateGhostId(index, value)}
                            onRemove={() => removeGhostId(index)}
                            showRemoveButton={ghostIds.length > 1}
                            disabled={isProcessing}
                            error={errors[`ghost_${index}`]}
                          />
                        ))}
                      </div>

                      <p className="text-xs text-gray-500 mt-2">
                        Each GhostID will receive an NFT access pass to this chat room
                      </p>
                    </div>

                    <div className="flex justify-end mt-5">
                      <button
                        onClick={handleNext}
                        className="bg-[#FF4D00] text-black font-medium py-2.5 px-5 rounded-xl transition-colors flex items-center hover:opacity-90"
                      >
                        Next
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-[#222222] rounded-xl p-4 mb-3">
                      <h3 className="text-sm font-medium mb-3">Fee Summary</h3>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Room Type:</span>
                          <span className="text-xs font-medium">Private</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">NFT Access Passes:</span>
                          <span className="text-xs font-medium">
                            {ghostIds.filter((id) => id.trim() !== "").length}
                          </span>
                        </div>
                      </div>

                      {ghostIds.filter((id) => id.trim() !== "").length > 0 && (
                        <div className="border-t border-[#222222] pt-3 mb-3">
                          <h4 className="text-xs font-medium mb-2">GhostID Recipients:</h4>
                          <div className="max-h-[80px] overflow-y-auto border border-[#222222] rounded-xl p-2">
                            {ghostIds
                              .filter((id) => id.trim() !== "")
                              .map((id, index) => (
                                <div key={index} className="flex items-center mb-1.5">
                                  <Check size={10} className="text-green-500 mr-1.5 flex-shrink-0" />
                                  <span className="text-xs font-mono truncate">{id}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="border-t border-[#222222] pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">Base Price:</span>
                          <span className="text-xs font-medium">{BASE_PRICE} SOL</span>
                        </div>
                        {ghostIds.filter((id) => id.trim() !== "").length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">
                              NFT Access Passes ({ghostIds.filter((id) => id.trim() !== "").length} × {PRICE_PER_NFT}{" "}
                              SOL):
                            </span>
                            <span className="text-xs font-medium">
                              {(ghostIds.filter((id) => id.trim() !== "").length * PRICE_PER_NFT).toFixed(3)} SOL
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#222222]">
                          <span className="text-xs font-medium">Total:</span>
                          <span className="text-xs font-bold text-[#FF4D00]">
                            {calculateTotalPrice().toFixed(3)} SOL
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleBack}
                        className="flex-1 bg-[#222222] text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center"
                        disabled={isProcessing}
                      >
                        <ArrowLeft size={14} className="mr-1.5" />
                        Back
                      </button>

                      <button
                        onClick={handleSubmit}
                        className="flex-1 bg-[#FF4D00] text-black font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center hover:opacity-90 disabled:opacity-50"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={14} className="mr-1.5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Mint & Send NFTs"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Public room - show copy room ID option
              <div className="space-y-4">
                <p className="text-gray-300 mb-4">
                  This is a public room. Share the Room ID with others to let them join.
                </p>

                <div className="border border-[#222222] rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-2">Room ID</p>
                  <div className="flex items-center">
                    <div className="flex-1 bg-[#1a1a1a] p-3 rounded-l-xl border border-[#333333] border-r-0 overflow-hidden">
                      <p className="text-sm font-mono truncate">{roomData.roomId}</p>
                    </div>
                    <button
                      onClick={handleCopyRoomId}
                      className="bg-[#FF4D00] text-black p-3 rounded-r-xl transition-colors hover:opacity-90"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Anyone with this Room ID can request to join this chat room
                  </p>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setShowAddParticipantModal(false)}
                    className="bg-[#FF4D00] text-black font-medium py-2.5 px-5 rounded-xl transition-colors hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RightSidebar
