"use client"

import type React from "react"

import { CheckCircle2 } from "lucide-react"

interface UserNftInfo {
  nftIdentifier: string
  name?: string
  imageUrl?: string
  metadataUri?: string
}

interface NftListProps {
  nfts: UserNftInfo[]
  selectedNft: UserNftInfo | null
  onSelectNft: (nft: UserNftInfo) => void
  onOpenSelection: () => void
  showAll?: boolean
}

const NftList: React.FC<NftListProps> = ({ nfts, selectedNft, onSelectNft, onOpenSelection, showAll = false }) => {
  const displayNfts = showAll ? nfts : nfts.slice(0, 3)

  if (selectedNft) {
    return (
      <div className="mb-5">
        <h3 className="text-sm font-medium mb-3 flex items-center">
          <CheckCircle2 size={15} className="mr-2 text-green-500" />
          Selected NFT Access Pass
        </h3>
        <div className="border-2 border-[#FF4D00] rounded-xl p-4 bg-[#FF4D00]/10">
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-lg overflow-hidden mr-4 flex-shrink-0 bg-[#222]">
              <img
                src={
                  selectedNft.imageUrl ||
                  `https://placehold.co/64x64/111111/555555?text=${selectedNft.name ? selectedNft.name.charAt(0) : "N"}`
                }
                alt={selectedNft.name || "NFT Image"}
                className="w-full h-full object-cover"
                onError={(e) =>
                  (e.currentTarget.src = `https://placehold.co/64x64/111111/555555?text=${selectedNft.name ? selectedNft.name.charAt(0) : "N"}`)
                }
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-white mb-1">{selectedNft.name || "Unnamed NFT"}</p>
              <p className="text-sm text-gray-300">
                {selectedNft.nftIdentifier.substring(0, 8)}...
                {selectedNft.nftIdentifier.substring(selectedNft.nftIdentifier.length - 8)}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenSelection}
              className="ml-3 text-sm text-[#FF4D00] hover:text-[#FF4D00]/80 transition-colors font-medium"
            >
              Change
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-medium flex items-center">
          <CheckCircle2 size={15} className="mr-2 text-green-500" />
          Select Your NFT Access Pass
        </h3>
        <button
          type="button"
          onClick={onOpenSelection}
          className="text-xs text-[#FF4D00] hover:text-[#FF4D00]/80 transition-colors"
        >
          View All ({nfts.length})
        </button>
      </div>
      <div className="space-y-2.5 border border-[#333333] rounded-xl p-3">
        {displayNfts.map((nft) => (
          <div
            key={nft.nftIdentifier}
            onClick={() => onSelectNft(nft)}
            className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-150 ease-in-out ${
              selectedNft?.nftIdentifier === nft.nftIdentifier
                ? "bg-[#FF4D00]/20 border border-[#FF4D00]/50 ring-1 ring-[#FF4D00]"
                : "bg-[#1C1C1C] border border-[#333333] hover:bg-[#2a2a2a] hover:border-[#555555]"
            }`}
          >
            <div className="w-10 h-10 rounded-md overflow-hidden mr-3 flex-shrink-0 bg-[#222]">
              <img
                src={
                  nft.imageUrl || `https://placehold.co/60x60/111111/555555?text=${nft.name ? nft.name.charAt(0) : "N"}`
                }
                alt={nft.name || "NFT Image"}
                className="w-full h-full object-cover"
                onError={(e) =>
                  (e.currentTarget.src = `https://placehold.co/60x60/111111/555555?text=${nft.name ? nft.name.charAt(0) : "N"}`)
                }
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-100">{nft.name || "Unnamed NFT"}</p>
              <p className="text-xs text-gray-400 truncate">
                {nft.nftIdentifier.substring(0, 4)}...
                {nft.nftIdentifier.substring(nft.nftIdentifier.length - 4)}
              </p>
            </div>
            {selectedNft?.nftIdentifier === nft.nftIdentifier && (
              <CheckCircle2 size={18} className="text-[#FF4D00] ml-2.5 flex-shrink-0" />
            )}
          </div>
        ))}
        {nfts.length > 3 && !showAll && (
          <button
            type="button"
            onClick={onOpenSelection}
            className="w-full p-3 rounded-lg border border-[#333333] hover:border-[#FF4D00] text-[#FF4D00] hover:bg-[#FF4D00]/10 transition-all duration-150 text-sm"
          >
            View All {nfts.length} NFTs
          </button>
        )}
      </div>
    </>
  )
}

export default NftList
