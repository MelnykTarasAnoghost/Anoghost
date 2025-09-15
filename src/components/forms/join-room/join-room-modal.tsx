"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { requestJoinRoom } from "@/services/socket"
import { Ghost, X, AlertTriangle, Loader2 } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { verifyNftAccessPass } from "@/api/apiNft"
import { useGhostNest } from "@/contexts/GhostNestContext"
import { useGhostId } from "@/contexts/GhostIdContext"
import NftSelectionModal from "./nft-selection-modal"
import JoinMethodTabs from "./join-method-tabs"
import RoomIdForm from "./room-id-form"
import NftAccessForm from "./nft-access-form"

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onJoinSuccess: (roomData: any, nickname: string) => void
  onJoinPending: (roomInfo: { roomId: string; roomName: string }, nickname: string) => void
}

type JoinMethod = "roomId" | "nftAccess"

interface UserNftInfo {
  nftIdentifier: string
  name?: string
  imageUrl?: string
  metadataUri?: string
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onJoinSuccess, onJoinPending }) => {
  const [joinMethod, setJoinMethod] = useState<JoinMethod>("roomId")
  const [nicknameInput, setNicknameInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientNfts, setClientNfts] = useState<UserNftInfo[]>([])
  const [isFetchingClientNfts, setIsFetchingClientNfts] = useState(false)
  const [selectedClientNft, setSelectedClientNft] = useState<UserNftInfo | null>(null)
  const [isNftSelectionModalOpen, setIsNftSelectionModalOpen] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const { publicKey } = useWallet()
  const { API_URL } = useGhostNest()
  const { isRegistered, isLoading: isGhostIdLoading } = useGhostId()

  useEffect(() => {
    if (isRegistered && nicknameInput === "") {
      const newNickname = `Anonymous-${Math.floor(Math.random() * 10000)}`
      setNicknameInput(newNickname)
    }
  }, [isRegistered])

  useEffect(() => {
    if (isOpen) {
      setError(null)
      if (joinMethod === "nftAccess") {
        setIsNftSelectionModalOpen(false)
      }
    }
  }, [isOpen, joinMethod])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !isLoading &&
        !isFetchingClientNfts &&
        !isNftSelectionModalOpen
      ) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose, isLoading, isFetchingClientNfts, isNftSelectionModalOpen])

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading && !isFetchingClientNfts && !isNftSelectionModalOpen) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener("keydown", handleEscKey)
    return () => document.removeEventListener("keydown", handleEscKey)
  }, [isOpen, onClose, isLoading, isFetchingClientNfts, isNftSelectionModalOpen])

  const handleRoomIdSubmit = async (roomId: string, nickname: string) => {
    if (!roomId) {
      setError("Please enter a room ID")
      return
    }
    if (!nickname) {
      setError("Please enter a nickname")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await requestJoinRoom(roomId, nickname)
      if (result.success) {
        if (result.status === "joined" && result.roomData) {
          const roomDataWithNickname = { ...result.roomData, nickname }
          onJoinSuccess(roomDataWithNickname, nickname)
        } else if (result.status === "pending" && result.roomData) {
          const roomInfoWithNickname = { ...result.roomData, nickname }
          onJoinPending(roomInfoWithNickname, nickname)
        }
        onClose()
      } else {
        setError(result.error || "Failed to join room")
      }
    } catch (err) {
      console.error("Error joining room by ID:", err)
      setError("Failed to join room. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNftSubmit = async (selectedNft: UserNftInfo, nickname: string) => {
    if (!selectedNft) {
      setError("Please select an NFT access pass.")
      return
    }
    if (!publicKey) {
      setError("Wallet not connected.")
      return
    }
    if (!nickname) {
      setError("Please enter a nickname")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const verifyData = await verifyNftAccessPass(API_URL, selectedNft.nftIdentifier, publicKey.toString())

      if (verifyData.status !== "success") {
        setError(
          verifyData.message ||
            verifyData.reason ||
            "NFT verification failed. This NFT may not grant access or is invalid.",
        )
        setIsLoading(false)
        return
      }

      const verifiedRoomId = verifyData.roomId
      if (!verifiedRoomId) {
        setError("Could not retrieve room ID from verified NFT.")
        setIsLoading(false)
        return
      }

      const joinResult = await requestJoinRoom(verifiedRoomId, nickname)

      if (joinResult.success) {
        if (joinResult.status === "joined" && joinResult.roomData) {
          const roomDataWithNickname = { ...joinResult.roomData, nickname }
          onJoinSuccess(roomDataWithNickname, nickname)
        } else if (joinResult.status === "pending" && joinResult.roomData) {
          const roomInfoWithNickname = { ...joinResult.roomData, nickname }
          onJoinPending(roomInfoWithNickname, nickname)
        }
        onClose()
      } else {
        setError(joinResult.error || "Failed to join room with NFT after verification.")
      }
    } catch (err) {
      console.error("Error joining room with NFT:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenNftSelection = () => {
    if (clientNfts.length > 0) {
      setIsNftSelectionModalOpen(true)
    }
  }

  const handleMainModalClose = () => {
    setError(null)
    setClientNfts([])
    setSelectedClientNft(null)
    setIsNftSelectionModalOpen(false)
    setJoinMethod("roomId")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="bg-black rounded-2xl w-full max-w-md p-6 border border-[#333333] shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-medium flex items-center tracking-tight">
            <Ghost size={22} className="mr-2.5 text-[#FF4D00]" />
            Join Chat Room
          </h2>
          <button
            onClick={handleMainModalClose}
            disabled={isLoading || isFetchingClientNfts}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center text-gray-400 transition-colors border border-[#222222] hover:border-[#FF4D00] hover:text-[#FF4D00] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <JoinMethodTabs joinMethod={joinMethod} onMethodChange={setJoinMethod} onError={setError} />

        {error && (
          <div className="mb-5 p-3.5 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-xl text-[#FF4D00] text-xs flex items-start">
            <AlertTriangle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {isGhostIdLoading ? (
          <div className="text-center py-6">
            <Loader2 size={36} className="mx-auto mb-4 text-[#FF4D00] animate-spin" />
            <h3 className="text-lg font-medium mb-2.5">Authenticating...</h3>
            <p className="text-sm text-gray-400">Please wait while we set up your anonymous identity.</p>
          </div>
        ) : (
          <>
            {joinMethod === "roomId" ? (
              <RoomIdForm
                nicknameInput={nicknameInput}
                onNicknameChange={setNicknameInput}
                onSubmit={handleRoomIdSubmit}
                onCancel={handleMainModalClose}
                isLoading={isLoading}
              />
            ) : (
              <NftAccessForm
                nicknameInput={nicknameInput}
                onNicknameChange={setNicknameInput}
                onSubmit={handleNftSubmit}
                onCancel={handleMainModalClose}
                isLoading={isLoading}
                onError={setError}
                onOpenNftSelection={handleOpenNftSelection}
                clientNfts={clientNfts}
                setClientNfts={setClientNfts}
                selectedClientNft={selectedClientNft}
                setSelectedClientNft={setSelectedClientNft}
                isFetchingClientNfts={isFetchingClientNfts}
                setIsFetchingClientNfts={setIsFetchingClientNfts}
              />
            )}
          </>
        )}
      </div>

      <NftSelectionModal
        isOpen={isNftSelectionModalOpen}
        onClose={() => setIsNftSelectionModalOpen(false)}
        nfts={clientNfts}
        selectedNft={selectedClientNft}
        onSelectNft={setSelectedClientNft}
        onConfirm={() => setIsNftSelectionModalOpen(false)}
      />
    </div>
  )
}

export default JoinRoomModal
