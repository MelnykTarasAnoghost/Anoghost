"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { requestJoinRoom } from "../services/socket"
import { Copy, Ghost, Key, X, ArrowRight, Scan, Wallet, Loader2, CheckCircle2 } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import GhostIdInput from "./GhostIdInput"

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onJoinSuccess: (roomData: any) => void
  onJoinPending: (roomInfo: { roomId: string; roomName: string }) => void
}

type JoinMethod = "roomId" | "nftAccess"

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onJoinSuccess, onJoinPending }) => {
  const [joinMethod, setJoinMethod] = useState<JoinMethod>("roomId")
  const [roomId, setRoomId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedNft, setSelectedNft] = useState<any>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { connected, publicKey } = useWallet()
  const [ghostId, setGhostId] = useState<string>("")
  const [showGhostIdInput, setShowGhostIdInput] = useState(false)

  // Mock NFTs for demonstration
  const mockNfts = [
    {
      id: "nft1",
      name: "Ghost Chat Access #1",
      roomId: "ghost-123",
      roomName: "Ghost Chat #1",
      image: "/placeholder.svg",
    },
    {
      id: "nft2",
      name: "Ghost Chat Access #2",
      roomId: "ghost-456",
      roomName: "Ghost Chat #2",
      image: "/placeholder.svg",
    },
  ]

  // Focus the input when modal opens and method is roomId
  useEffect(() => {
    if (isOpen && joinMethod === "roomId" && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, joinMethod])

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

  const handleRoomIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!roomId.trim()) {
      setError("Please enter a room ID")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Request to join the room
      const result = await requestJoinRoom(roomId.trim())

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

  const handleScanNft = async () => {
    setIsScanning(true)
    setError(null)

    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false)
      // For demo purposes, just select the first NFT
      if (mockNfts.length > 0) {
        setSelectedNft(mockNfts[0])
      } else {
        setError("No NFT access passes found in your wallet")
      }
    }, 2000)
  }

  const handleNftSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedNft) {
      setError("Please select an NFT access pass")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // In a real implementation, we would verify the NFT ownership
      // and extract the room ID from the NFT metadata

      // For demo purposes, use the roomId from the selected NFT
      const result = await requestJoinRoom(selectedNft.roomId)

      if (result.success) {
        if (result.status === "joined" && result.roomData) {
          onJoinSuccess(result.roomData)
        } else if (result.status === "pending" && result.roomData) {
          onJoinPending({
            roomId: result.roomData.roomId,
            roomName: result.roomData.roomName,
          })
        }
        onClose()
      } else {
        setError(result.error || "Failed to join room with NFT")
      }
    } catch (error) {
      console.error("Error joining room with NFT:", error)
      setError("Failed to join room with NFT. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectNft = (nft: any) => {
    setSelectedNft(nft.id === selectedNft?.id ? null : nft)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-black rounded-2xl w-full max-w-md p-6 border border-[#333333] shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-medium flex items-center tracking-tight">
            <Ghost size={22} className="mr-2.5 text-[#FF4D00]" />
            Join Chat Room
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222222] hover:border-[#FF4D00] hover:text-[#FF4D00]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#333333] mb-6">
          <button
            onClick={() => {
              setJoinMethod("roomId")
              setError(null)
            }}
            className={`flex-1 py-2.5 text-sm font-medium relative ${
              joinMethod === "roomId" ? "text-white" : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <div className="flex items-center justify-center">
              <Copy size={15} className="mr-2" />
              Room ID
            </div>
            {joinMethod === "roomId" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF4D00]"></div>}
          </button>
          <button
            onClick={() => {
              setJoinMethod("nftAccess")
              setError(null)
              setSelectedNft(null)
            }}
            className={`flex-1 py-2.5 text-sm font-medium relative ${
              joinMethod === "nftAccess" ? "text-white" : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <div className="flex items-center justify-center">
              <Key size={15} className="mr-2" />
              NFT Access
            </div>
            {joinMethod === "nftAccess" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF4D00]"></div>}
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-xl text-[#FF4D00] text-xs flex items-start">
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
              className="mr-2 mt-0.5 flex-shrink-0"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {joinMethod === "roomId" ? (
          <form onSubmit={handleRoomIdSubmit} className="space-y-5">
            <div>
              <label htmlFor="roomId" className="block text-sm mb-2.5 text-gray-300 flex items-center tracking-tight">
                <Copy size={15} className="mr-1.5 text-[#FF4D00]" />
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
                  className="w-full p-3.5 pl-10 rounded-xl bg-black text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
                  disabled={isLoading}
                  required
                />
                <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500">
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
                <p className="text-xs text-gray-500 mt-1.5 ml-1.5">Enter the room ID shared with you</p>
              </div>
            </div>

            {showGhostIdInput && (
              <div className="mb-4">
                <label className="block text-sm mb-1.5 text-gray-400">GhostID</label>
                <GhostIdInput
                  value={ghostId}
                  index={0}
                  onChange={setGhostId}
                  onRemove={() => {}} // No remove functionality needed here
                  showRemoveButton={false}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1.5 ml-1.5">Enter your GhostID to access this private room</p>
              </div>
            )}

            <div className="flex space-x-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 bg-[#111111] hover:bg-[#222222] text-white font-medium py-3.5 px-4 rounded-xl transition-colors focus:outline-none disabled:opacity-50 border border-[#222222] hover:border-[#333333]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !roomId.trim()}
                className="flex-1 bg-[#FF4D00] text-black font-medium py-3.5 px-4 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 size={16} className="mr-2 animate-spin" />
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
        ) : (
          <div className="space-y-5">
            {!connected ? (
              <div className="text-center py-6">
                <Wallet size={36} className="mx-auto mb-5 text-[#FF4D00]" />
                <h3 className="text-lg font-medium mb-2.5">Connect Your Wallet</h3>
                <p className="text-sm text-gray-400 mb-5">Connect your wallet to access your NFT passes</p>
                <button
                  type="button"
                  className="bg-[#FF4D00] text-black font-medium py-3 px-8 rounded-xl transition-colors hover:opacity-90"
                  onClick={() => {
                    // This would trigger the wallet connection
                    console.log("Connect wallet clicked")
                  }}
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <form onSubmit={handleNftSubmit} className="space-y-5">
                {!selectedNft && !isScanning ? (
                  <div className="border border-[#333333] rounded-xl p-5 text-center">
                    <Scan size={36} className="mx-auto mb-4 text-[#FF4D00]" />
                    <h3 className="text-md font-medium mb-2.5">Scan NFT Access Pass</h3>
                    <p className="text-xs text-gray-400 mb-5">Scan your NFT to access private rooms</p>
                    <button
                      type="button"
                      onClick={handleScanNft}
                      disabled={isLoading}
                      className="bg-[#FF4D00] text-black font-medium py-2.5 px-7 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50"
                    >
                      Scan NFT
                    </button>
                  </div>
                ) : isScanning ? (
                  <div className="border border-[#333333] rounded-xl p-7 text-center">
                    <div className="w-16 h-16 mx-auto mb-5 relative">
                      <div className="absolute inset-0 border-2 border-[#FF4D00] rounded-full animate-ping opacity-75"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-[#FF4D00]" />
                      </div>
                    </div>
                    <h3 className="text-md font-medium mb-2.5">Scanning NFTs...</h3>
                    <p className="text-xs text-gray-400">Looking for NFT access passes in your wallet</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-medium mb-3.5 flex items-center">
                      <CheckCircle2 size={15} className="mr-2 text-[#FF4D00]" />
                      Select NFT Access Pass
                    </h3>
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                      {mockNfts.map((nft) => (
                        <div
                          key={nft.id}
                          onClick={() => handleSelectNft(nft)}
                          className={`flex items-center p-3.5 rounded-xl cursor-pointer transition-colors ${
                            selectedNft?.id === nft.id
                              ? "bg-[#FF4D00]/10 border border-[#FF4D00]/30"
                              : "border border-[#333333] hover:border-[#555555]"
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden mr-3.5 flex-shrink-0">
                            <img
                              src={nft.image || "/placeholder.svg"}
                              alt={nft.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{nft.name}</p>
                            <p className="text-xs text-gray-400 truncate">Room: {nft.roomName}</p>
                          </div>
                          {selectedNft?.id === nft.id && (
                            <CheckCircle2 size={18} className="text-[#FF4D00] ml-2.5 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-4 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading || isScanning}
                    className="flex-1 bg-[#111111] hover:bg-[#222222] text-white font-medium py-3.5 px-4 rounded-xl transition-colors focus:outline-none disabled:opacity-50 border border-[#222222] hover:border-[#333333]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || isScanning || !selectedNft}
                    className="flex-1 bg-[#FF4D00] text-black font-medium py-3.5 px-4 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <Loader2 size={16} className="mr-2 animate-spin" />
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default JoinRoomModal
