"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { X, Search, Calendar, CheckCircle2, ArrowLeft } from "lucide-react"

interface UserNftInfo {
  nftIdentifier: string
  name?: string
  imageUrl?: string
  metadataUri?: string
}

interface NftSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  nfts: UserNftInfo[]
  selectedNft: UserNftInfo | null
  onSelectNft: (nft: UserNftInfo) => void
  onConfirm: () => void
}

const NftSelectionModal: React.FC<NftSelectionModalProps> = ({
  isOpen,
  onClose,
  nfts,
  selectedNft,
  onSelectNft,
  onConfirm,
}) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const modalRef = useRef<HTMLDivElement>(null)

  // Filter and sort NFTs
  const filteredAndSortedNfts = nfts
    .filter(
      (nft) =>
        nft.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nft.nftIdentifier.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      // For now, we'll sort by name since we don't have creation date
      // In a real implementation, you'd sort by actual creation date
      const nameA = a.name || a.nftIdentifier
      const nameB = b.name || b.nftIdentifier
      return sortOrder === "newest" ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB)
    })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    if (isOpen) document.addEventListener("keydown", handleEscKey)
    return () => document.removeEventListener("keydown", handleEscKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("")
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-black rounded-2xl w-full max-w-4xl max-h-[90vh] border border-[#333333] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#333333]">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center text-gray-400 transition-colors border border-[#222222] hover:border-[#FF4D00] hover:text-[#FF4D00] mr-4"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-xl font-medium tracking-tight">Select Your NFT Access Pass</h2>
            <span className="ml-3 text-sm text-gray-400">
              ({filteredAndSortedNfts.length} of {nfts.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center text-gray-400 transition-colors border border-[#222222] hover:border-[#FF4D00] hover:text-[#FF4D00]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search and Sort Controls */}
        <div className="p-6 border-b border-[#333333] space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search NFTs by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111111] text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="px-4 py-3 rounded-xl bg-[#111111] text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* NFT Grid/List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAndSortedNfts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">No NFTs found</div>
              <div className="text-sm text-gray-500">
                {searchQuery ? "Try adjusting your search terms" : "No NFT access passes available"}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop: Card Grid */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAndSortedNfts.map((nft) => (
                  <div
                    key={nft.nftIdentifier}
                    onClick={() => onSelectNft(nft)}
                    className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-200 ${
                      selectedNft?.nftIdentifier === nft.nftIdentifier
                        ? "ring-2 ring-[#FF4D00] bg-[#FF4D00]/10"
                        : "hover:ring-1 hover:ring-[#555555] bg-[#111111]"
                    }`}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={
                          nft.imageUrl ||
                          `https://placehold.co/300x300/111111/555555?text=${nft.name ? nft.name.charAt(0) : "N"}`
                        }
                        alt={nft.name || "NFT Image"}
                        className="w-full h-full object-cover"
                        onError={(e) =>
                          (e.currentTarget.src = `https://placehold.co/300x300/111111/555555?text=${nft.name ? nft.name.charAt(0) : "N"}`)
                        }
                      />
                      {selectedNft?.nftIdentifier === nft.nftIdentifier && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 size={24} className="text-[#FF4D00] bg-black rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-white truncate mb-1">{nft.name || "Unnamed NFT"}</h3>
                      <p className="text-xs text-gray-400 truncate">
                        {nft.nftIdentifier.substring(0, 8)}...
                        {nft.nftIdentifier.substring(nft.nftIdentifier.length - 8)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile: List View */}
              <div className="md:hidden space-y-3">
                {filteredAndSortedNfts.map((nft) => (
                  <div
                    key={nft.nftIdentifier}
                    onClick={() => onSelectNft(nft)}
                    className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedNft?.nftIdentifier === nft.nftIdentifier
                        ? "bg-[#FF4D00]/20 border border-[#FF4D00]/50 ring-1 ring-[#FF4D00]"
                        : "bg-[#111111] border border-[#333333] hover:bg-[#1a1a1a] hover:border-[#555555]"
                    }`}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden mr-4 flex-shrink-0 bg-[#222]">
                      <img
                        src={
                          nft.imageUrl ||
                          `https://placehold.co/64x64/111111/555555?text=${nft.name ? nft.name.charAt(0) : "N"}`
                        }
                        alt={nft.name || "NFT Image"}
                        className="w-full h-full object-cover"
                        onError={(e) =>
                          (e.currentTarget.src = `https://placehold.co/64x64/111111/555555?text=${nft.name ? nft.name.charAt(0) : "N"}`)
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate mb-1">{nft.name || "Unnamed NFT"}</h3>
                      <p className="text-sm text-gray-400 truncate">
                        {nft.nftIdentifier.substring(0, 6)}...
                        {nft.nftIdentifier.substring(nft.nftIdentifier.length - 6)}
                      </p>
                    </div>
                    {selectedNft?.nftIdentifier === nft.nftIdentifier && (
                      <CheckCircle2 size={20} className="text-[#FF4D00] ml-3 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#333333]">
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 bg-[#111111] hover:bg-[#222222] text-white font-medium py-3.5 px-4 rounded-xl transition-colors border border-[#222222] hover:border-[#333333]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!selectedNft}
              className="flex-1 bg-[#FF4D00] text-black font-medium py-3.5 px-4 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NftSelectionModal
