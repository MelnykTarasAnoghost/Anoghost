"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { X, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react"
import { callGenerateNftApi } from "../utils/nftMinter"

interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  participants: Array<{ nickname: string; joinedAt: number }>
}

interface NftMinterProps {
  roomData: RoomData
  onNftGenerated: (nft: any) => void
}

const NftMinter: React.FC<NftMinterProps> = ({ roomData, onNftGenerated }) => {
  const { publicKey, wallet} = useWallet()
  const [name, setName] = useState(`${roomData.roomName} Access Pass`)
  const [description, setDescription] = useState(`This NFT grants access to the "${roomData.roomName}" chat room.`)
  const [recipientWallets, setRecipientWallets] = useState<string>("")
  const [creatorSecretKey, setCreatorSecretKey] = useState<string>("")
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [mintedNfts, setMintedNfts] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!publicKey) {
      setError("Wallet not connected")
      return
    }

    if (!imageFile) {
      setError("Please upload an image for your NFT")
      return
    }

    if (!creatorSecretKey) {
      setError("Creator secret key is required")
      return
    }

    // Validate recipient wallets
    const walletAddresses = recipientWallets
      .split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0)

    if (walletAddresses.length === 0) {
      setError("Please enter at least one recipient wallet address")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Call the generateNft function
      const nfts = await callGenerateNftApi({
        name,
        description,
        imageFile,
        recipients: walletAddresses,
        wallet: wallet
      })

      console.log("NFTs minted successfully:", nfts)

      setMintedNfts(nfts)
      setSuccess(true)
      onNftGenerated(nfts)
    } catch (error: any) {
      console.error("Error minting NFT:", error)
      setError(error.message || "Failed to mint NFT. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSecretKeyVisibility = () => {
    setShowSecretKey(!showSecretKey)
  }

  return (
    <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
      <div className="p-3 bg-[#1a1a1a]">
        <h3 className="text-sm font-medium text-white">Create & Drop NFT Access Passes</h3>
      </div>

      <div className="p-4">
        {success ? (
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">NFT Created Successfully!</h3>
            <p className="text-sm text-gray-400 mb-4">
              {mintedNfts.length} NFT(s) have been minted and dropped to the recipient wallets
            </p>

            {mintedNfts.length > 0 && (
              <div className="border border-[#1a1a1a] rounded-lg p-4 mb-4">
                <div className="aspect-square w-full max-w-[200px] mx-auto rounded-md overflow-hidden mb-4">
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt={mintedNfts[0].name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-md font-medium mb-1">{mintedNfts[0].name}</h4>
                <p className="text-sm text-gray-400 mb-3">{mintedNfts[0].description}</p>
                <div className="text-xs text-gray-400 mb-2">
                  <p>Dropped to {mintedNfts.length} wallet(s)</p>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {mintedNfts.map((nft, index) => (
                      <div key={index} className="border border-[#1a1a1a] rounded p-2 mb-2 text-left">
                        <p className="font-mono text-xs break-all">Mint: {nft.mint}</p>
                        <p className="font-mono text-xs break-all">Recipient: {nft.recipient}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setSuccess(false)
                setMintedNfts([])
                setImageFile(null)
                setPreviewUrl(null)
                setRecipientWallets("")
              }}
              className="bg-[#1a1a1a] text-white font-medium py-2 px-4 rounded-lg transition-colors hover:bg-[#333333]"
            >
              Create Another NFT
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00] text-xs flex items-start">
                <AlertTriangle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="nftName" className="block text-xs text-gray-400 mb-1">
                NFT Name
              </label>
              <input
                id="nftName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 rounded-lg bg-[#1a1a1a] text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors text-sm"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="nftDescription" className="block text-xs text-gray-400 mb-1">
                Description
              </label>
              <textarea
                id="nftDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 rounded-lg bg-[#1a1a1a] text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors text-sm h-20 resize-none"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="creatorSecretKey" className="block text-xs text-gray-400 mb-1">
                Creator Secret Key (base58 encoded)
              </label>
              <div className="relative">
                <input
                  id="creatorSecretKey"
                  type={showSecretKey ? "text" : "password"}
                  value={creatorSecretKey}
                  onChange={(e) => setCreatorSecretKey(e.target.value)}
                  placeholder="Enter your wallet's secret key..."
                  className="w-full p-2 rounded-lg bg-[#1a1a1a] text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors text-sm font-mono"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={toggleSecretKeyVisibility}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-[#FF4D00] mt-1">
                Warning: Never share your secret key. This should only be used in a secure environment.
              </p>
            </div>

            <div>
              <label htmlFor="recipientWallets" className="block text-xs text-gray-400 mb-1">
                Recipient Wallet Addresses (comma separated)
              </label>
              <textarea
                id="recipientWallets"
                value={recipientWallets}
                onChange={(e) => setRecipientWallets(e.target.value)}
                placeholder="Enter Solana wallet addresses..."
                className="w-full p-2 rounded-lg bg-[#1a1a1a] text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors text-xs font-mono h-24 resize-none"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">NFT access passes will be dropped to these addresses</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">NFT Image</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={isLoading}
              />

              {previewUrl ? (
                <div className="relative border border-[#333333] rounded-lg overflow-hidden">
                  <img src={previewUrl || "/placeholder.svg"} alt="NFT Preview" className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-black"
                    disabled={isLoading}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-[#333333] rounded-lg p-6 text-center cursor-pointer hover:border-[#FF4D00] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <p className="text-sm text-gray-400 mb-1">Drag and drop an image here</p>
                  <p className="text-xs text-gray-500">or click to browse</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !imageFile}
                className="w-full bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Minting & Dropping NFTs...
                  </>
                ) : (
                  "Mint & Drop NFT Access Passes"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default NftMinter
