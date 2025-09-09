"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { generateMockNft } from "../services/socket"
import { Copy, Check, X, Share2, Shield, Download, Zap } from "lucide-react"

interface ShareRoomModalProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  roomName: string
  accessToken?: string
}

const ShareRoomModal: React.FC<ShareRoomModalProps> = ({ isOpen, onClose, roomId, roomName, accessToken }) => {
  const [copied, setCopied] = useState(false)
  const [copyType, setCopyType] = useState<"id" | "token" | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [isGeneratingNft, setIsGeneratingNft] = useState(false)
  const [generatedNft, setGeneratedNft] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  // Handle escape key to close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey)
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [isOpen, onClose])

  // Reset copied state after a delay
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false)
        setCopyType(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  const copyToClipboard = (text: string, type: "id" | "token") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setCopyType(type)
    })
  }

  const handleGenerateNft = async () => {
    try {
      setIsGeneratingNft(true)
      setError(null)

      // Create NFT attributes with room information
      const attributes = [
        { trait_type: "Type", value: "Room Access" },
        { trait_type: "Room ID", value: roomId },
        { trait_type: "Room Name", value: roomName },
        { trait_type: "Created", value: new Date().toISOString() },
      ]

      if (accessToken) {
        attributes.push({ trait_type: "Access Token", value: accessToken })
      }

      // Generate the NFT
      const result = await generateMockNft({
        name: `${roomName} Access Pass`,
        description: `This NFT grants access to the "${roomName}" chat room. Present this NFT to join the conversation.`,
        collectionIndex: 0, // Use the "Solana Chat Access" collection
        attributes,
      })

      if (result.success && result.nft) {
        setGeneratedNft(result.nft)
      } else {
        setError(result.error || "Failed to generate NFT")
      }
    } catch (error) {
      console.error("Error generating NFT:", error)
      setError("Failed to generate NFT. Please try again.")
    } finally {
      setIsGeneratingNft(false)
    }
  }

  const downloadNftImage = () => {
    if (!generatedNft || !generatedNft.image) return

    // Create a temporary link element
    const link = document.createElement("a")
    link.href = generatedNft.image
    link.download = `${roomName.replace(/\s+/g, "-").toLowerCase()}-access-nft.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-black rounded-2xl w-full max-w-md p-6 border border-[#222222]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium flex items-center tracking-tight">
            <Share2 size={20} className="mr-2 text-[#FF4D00]" />
            Share Room
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222222]"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-md text-[#FF4D00] text-sm">
            {error}
          </div>
        )}

        {!generatedNft ? (
          <>
            <p className="text-gray-300 mb-6 font-light">
              Generate an NFT access pass for "{roomName}" to share with others.
            </p>

            <div className="border border-[#222222] rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <Shield size={16} className="text-[#FF4D00] mr-2" />
                <h3 className="text-sm font-medium">Room Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Room Name</p>
                  <p className="text-sm font-medium">{roomName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Room ID</p>
                  <div className="flex items-center">
                    <p className="text-sm font-mono truncate flex-1">{roomId}</p>
                    <button
                      onClick={() => copyToClipboard(roomId, "id")}
                      className="ml-2 text-gray-400 hover:text-[#FF4D00] transition-colors"
                    >
                      {copied && copyType === "id" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                {accessToken && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Access Token</p>
                    <div className="flex items-center">
                      <p className="text-sm font-mono truncate flex-1">{accessToken.substring(0, 20)}...</p>
                      <button
                        onClick={() => copyToClipboard(accessToken, "token")}
                        className="ml-2 text-gray-400 hover:text-[#FF4D00] transition-colors"
                      >
                        {copied && copyType === "token" ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerateNft}
              disabled={isGeneratingNft}
              className="w-full bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isGeneratingNft ? (
                <>
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
                  Generating NFT...
                </>
              ) : (
                <>
                  <Zap size={16} className="mr-2" />
                  Generate NFT Access Pass
                </>
              )}
            </button>
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-300 mb-4 font-light">Your NFT access pass for "{roomName}" has been generated!</p>
              <div className="border border-[#222222] rounded-lg p-4 mb-4">
                <div className="aspect-square w-full bg-[#111111] rounded-md mb-4 overflow-hidden">
                  <img
                    src={generatedNft.image || "/placeholder.svg"}
                    alt={generatedNft.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-medium mb-1">{generatedNft.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{generatedNft.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  {generatedNft.attributes.map((attr: any, index: number) => (
                    <div key={index} className="border border-[#222222] rounded p-2 text-xs">
                      <p className="text-gray-400">{attr.trait_type}</p>
                      <p className="font-medium truncate">
                        {attr.trait_type === "Room ID" || attr.trait_type === "Access Token"
                          ? `${attr.value.substring(0, 8)}...`
                          : attr.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={downloadNftImage}
                className="flex-1 bg-[#111111] hover:bg-[#222222] text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none border border-[#222222] hover:border-[#333333] flex items-center justify-center"
              >
                <Download size={16} className="mr-2" />
                Download
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-lg transition-colors hover:opacity-90 flex items-center justify-center"
              >
                <Check size={16} className="mr-2" />
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShareRoomModal
