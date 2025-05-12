"use client"

import type React from "react"
import { useState } from "react"
import { X } from "lucide-react"

interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  participants: Array<{ nickname: string; joinedAt: number }>
}

interface LeftSidebarProps {
  roomData: RoomData
  nickname: string
  onClose: () => void
  mockNfts: any[]
}

// Simplify the LeftSidebar component
const LeftSidebar: React.FC<LeftSidebarProps> = ({ roomData, nickname, onClose, mockNfts }) => {
  const [activeTab, setActiveTab] = useState<"chats" | "nfts">("chats")

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="font-medium text-white">Chat Rooms</h2>
        </div>
        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-[#1a1a1a]">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-black font-medium mr-3">
            {nickname.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{nickname}</p>
            <div className="text-xs text-gray-400">
              <span>Encrypted Identity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1a1a]">
        <button
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === "chats" ? "text-[#FF4D00] border-b-2 border-[#FF4D00]" : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("chats")}
        >
          Chats
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === "nfts" ? "text-[#FF4D00] border-b-2 border-[#FF4D00]" : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("nfts")}
        >
          NFTs
        </button>
      </div>

      {/* Content based on active tab */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chats" ? (
          <div className="p-2">
            {/* Current Room */}
            <div className="p-3 rounded-lg bg-[#1a1a1a] mb-2">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-black font-medium mr-3">
                  {roomData.roomName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{roomData.roomName}</p>
                  <div className="text-xs text-gray-400">
                    <span>{roomData.participants.length} participants</span>
                  </div>
                </div>
                <div className="bg-[#FF4D00] text-black text-xs font-medium py-1 px-2 rounded">Active</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="text-xs font-medium text-gray-400 mb-3">YOUR NFT COLLECTION</h3>

            {mockNfts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {mockNfts.map((nft, index) => (
                  <div key={index} className="bg-[#1a1a1a] rounded-lg p-2 overflow-hidden">
                    <div className="aspect-square w-full rounded-md overflow-hidden mb-2">
                      <img
                        src={nft.image || "/placeholder.svg"}
                        alt={nft.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs font-medium text-white truncate">{nft.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400">{nft.symbol}</span>
                      <span className="text-[10px] text-[#FF4D00]">Access</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <p className="text-white text-sm font-medium mb-2">No NFTs Yet</p>
                <p className="text-xs text-gray-400 mb-4">Generate NFT access passes to share with friends</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LeftSidebar
