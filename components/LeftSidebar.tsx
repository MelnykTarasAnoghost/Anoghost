"use client"

import type React from "react"
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
  participants: Array<{ nickname: string; joinedAt: number }>
}

// Simplify the LeftSidebar component
const LeftSidebar: React.FC<LeftSidebarProps> = ({ roomData, nickname, onClose, participants }) => {
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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
                  <span>{participants.length} participants</span>
                </div>
              </div>
              <div className="bg-[#FF4D00] text-black text-xs font-medium py-1 px-2 rounded">Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeftSidebar
