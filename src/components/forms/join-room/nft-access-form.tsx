"use client"

import type React from "react"
import { Wallet, Scan, Loader2, ArrowRight, User } from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi"
import { fetchAllDigitalAssetByOwner } from "@metaplex-foundation/mpl-token-metadata"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import NftList from "./nft-list"

interface UserNftInfo {
  nftIdentifier: string
  name?: string
  imageUrl?: string
  metadataUri?: string
}

interface NftAccessFormProps {
  nicknameInput: string
  onNicknameChange: (nickname: string) => void
  onSubmit: (selectedNft: UserNftInfo, nickname: string) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  onError: (error: string | null) => void
  onOpenNftSelection: () => void
  clientNfts: UserNftInfo[]
  setClientNfts: (nfts: UserNftInfo[]) => void
  selectedClientNft: UserNftInfo | null
  setSelectedClientNft: (nft: UserNftInfo | null) => void
  isFetchingClientNfts: boolean
  setIsFetchingClientNfts: (loading: boolean) => void
}

const NftAccessForm: React.FC<NftAccessFormProps> = ({
  nicknameInput,
  onNicknameChange,
  onSubmit,
  onCancel,
  isLoading,
  onError,
  onOpenNftSelection,
  clientNfts,
  setClientNfts,
  selectedClientNft,
  setSelectedClientNft,
  isFetchingClientNfts,
  setIsFetchingClientNfts,
}) => {
  const { connected, publicKey, wallet, connect: connectWalletAlias } = useWallet()
  const { connection } = useConnection()

  const handleAttemptConnectWallet = async () => {
    if (!wallet) {
      onError("No wallet provider found. Please ensure your wallet is set up or select a wallet.")
      return
    }
    try {
      if (!wallet.adapter.connected && connectWalletAlias) {
        await connectWalletAlias()
      } else if (!wallet.adapter.connected) {
        onError("Wallet connection function not available.")
      }
    } catch (e) {
      console.error("Failed to connect wallet", e)
      onError("Failed to connect wallet. Please try again.")
    }
  }

  const handleFetchMyNfts = async () => {
    if (!publicKey || !connection) {
      onError("Please connect your wallet first and ensure connection is available.")
      return
    }
    setIsFetchingClientNfts(true)
    onError(null)
    setSelectedClientNft(null)
    setClientNfts([])

    try {
      const umi = createUmi(connection.rpcEndpoint).use({
        install(context) {},
      })

      const owner = umiPublicKey(publicKey.toString())
      const assets = await fetchAllDigitalAssetByOwner(umi, owner)

      if (assets.length === 0) {
        onError("No NFTs found in your wallet.")
        setIsFetchingClientNfts(false)
        return
      }

      const fetchedNftsInfo: UserNftInfo[] = []
      for (const asset of assets) {
        let nftName: string | undefined = asset.metadata.name
        let imageUrl: string | undefined

        if (asset.metadata.uri && asset.metadata.uri.trim() !== "") {
          try {
            const response = await fetch(asset.metadata.uri)
            if (response.ok) {
              const jsonMetadata = await response.json()
              if (jsonMetadata.name) nftName = jsonMetadata.name
              if (jsonMetadata.image) imageUrl = jsonMetadata.image
            }
          } catch (metaError) {
            console.warn(`Failed to fetch/parse metadata from ${asset.metadata.uri} for ${asset.publicKey}:`, metaError)
          }
        }
        fetchedNftsInfo.push({
          nftIdentifier: asset.publicKey.toString(),
          name: nftName || "Unnamed NFT",
          imageUrl: imageUrl,
          metadataUri: asset.metadata.uri,
        })
      }
      setClientNfts(fetchedNftsInfo)
      if (fetchedNftsInfo.length === 0) {
        onError("No suitable NFT access passes found in your wallet after processing.")
      }
    } catch (err) {
      console.error("Error fetching NFTs client-side:", err)
      onError("An error occurred while fetching your NFTs.")
    } finally {
      setIsFetchingClientNfts(false)
    }
  }

  const handleSelectClientNft = (nft: UserNftInfo) => {
    setSelectedClientNft(nft.nftIdentifier === selectedClientNft?.nftIdentifier ? null : nft)
    onError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientNft) return

    const currentNickname = nicknameInput.trim() || `Anonymous-${Math.floor(Math.random() * 10000)}`
    await onSubmit(selectedClientNft, currentNickname)
  }

  if (!connected) {
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
              disabled={isLoading || isFetchingClientNfts}
              required
            />
          </div>
        </div>

        <div className="text-center py-6">
          <Wallet size={36} className="mx-auto mb-5 text-[#FF4D00]" />
          <h3 className="text-lg font-medium mb-2.5">Connect Your Wallet</h3>
          <p className="text-sm text-gray-400 mb-5">Connect your wallet to use NFT access.</p>
          <button
            type="button"
            className="bg-[#FF4D00] text-black font-medium py-3 px-8 rounded-xl transition-colors hover:opacity-90"
            onClick={handleAttemptConnectWallet}
          >
            Connect Wallet
          </button>
        </div>
      </>
    )
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
            disabled={isLoading || isFetchingClientNfts}
            required
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {clientNfts.length === 0 && !isFetchingClientNfts ? (
          <div className="border border-[#333333] rounded-xl p-5 text-center">
            <Scan size={36} className="mx-auto mb-4 text-[#FF4D00]" />
            <h3 className="text-md font-medium mb-2.5">Load Your NFT Access Passes</h3>
            <p className="text-xs text-gray-400 mb-5">Click the button to find NFT passes in your wallet.</p>
            <button
              type="button"
              onClick={handleFetchMyNfts}
              disabled={isFetchingClientNfts}
              className="bg-[#FF4D00] text-black font-medium py-2.5 px-7 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {isFetchingClientNfts ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Loading NFTs...
                </>
              ) : (
                "Load My NFTs"
              )}
            </button>
          </div>
        ) : isFetchingClientNfts ? (
          <div className="border border-[#333333] rounded-xl p-7 text-center">
            <div className="w-16 h-16 mx-auto mb-5 relative">
              <div className="absolute inset-0 border-2 border-[#FF4D00] rounded-full animate-ping opacity-75"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[#FF4D00]" />
              </div>
            </div>
            <h3 className="text-md font-medium mb-2.5">Loading Your NFTs...</h3>
            <p className="text-xs text-gray-400">Fetching NFT access passes from your wallet.</p>
          </div>
        ) : (
          <NftList
            nfts={clientNfts}
            selectedNft={selectedClientNft}
            onSelectNft={handleSelectClientNft}
            onOpenSelection={onOpenNftSelection}
          />
        )}

        <div className="flex space-x-4 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading || isFetchingClientNfts}
            className="flex-1 bg-[#111111] hover:bg-[#222222] text-white font-medium py-3.5 px-4 rounded-xl transition-colors focus:outline-none disabled:opacity-50 border border-[#222222] hover:border-[#333333]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || isFetchingClientNfts || !selectedClientNft || !nicknameInput.trim()}
            className="flex-1 bg-[#FF4D00] text-black font-medium py-3.5 px-4 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Verifying & Joining...
              </>
            ) : (
              <>
                Join with NFT <ArrowRight size={16} className="ml-2" />
              </>
            )}
          </button>
        </div>
      </form>
    </>
  )
}

export default NftAccessForm