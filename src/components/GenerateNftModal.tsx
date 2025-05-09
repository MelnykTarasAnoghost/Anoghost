"use client"

import type React from "react"
import { useState } from "react"
import { generateMockNft } from "../services/socket"
import { X, Loader2 } from "lucide-react"

interface GenerateNftModalProps {
  isOpen: boolean
  onClose: () => void
  onNftGenerated: (nft: any) => void
}

const GenerateNftModal: React.FC<GenerateNftModalProps> = ({ isOpen, onClose, onNftGenerated }) => {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [collectionIndex, setCollectionIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const collections = [
    { name: "Solana Chat Access", description: "Access tokens for Solana Chat rooms" },
    { name: "Solana VIP Pass", description: "VIP access to premium Solana Chat rooms" },
    { name: "Solana Moderator Badge", description: "Moderator privileges for Solana Chat" },
  ]

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      setError(null)

      const result = await generateMockNft({
        name: name || undefined,
        description: description || undefined,
        collectionIndex,
      })

      if (result.success && result.nft) {
        onNftGenerated(result.nft)
        onClose()
      } else {
        setError(result.error || "Failed to generate NFT")
      }
    } catch (err) {
      setError("Error generating NFT")
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-black rounded-md w-full max-w-md p-6 border border-[#222222]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-[#FF4D00] tracking-tight flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Generate NFT
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222222]"
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

        <div className="space-y-5">
          <div>
            <label htmlFor="collection" className="block text-sm mb-2 text-gray-400 flex items-center">
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
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Collection
            </label>
            <select
              id="collection"
              value={collectionIndex}
              onChange={(e) => setCollectionIndex(Number(e.target.value))}
              className="w-full p-3 rounded-md bg-black text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
              disabled={isGenerating}
            >
              {collections.map((collection, index) => (
                <option key={index} value={index}>
                  {collection.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1 ml-1">{collections[collectionIndex].description}</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm mb-2 text-gray-400 flex items-center">
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
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              NFT Name (Optional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${collections[collectionIndex].name} #1234`}
              className="w-full p-3 rounded-md bg-black text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1 ml-1">Leave blank for auto-generated name</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm mb-2 text-gray-400 flex items-center">
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
                <line x1="21" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="21" y1="18" x2="3" y2="18" />
              </svg>
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for your NFT"
              className="w-full p-3 rounded-md bg-black text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
              rows={3}
              disabled={isGenerating}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
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
                  className="mr-2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Generate NFT
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GenerateNftModal
