"use client"

import React from "react"
import { Users, Menu } from "lucide-react"

interface ChatHeaderProps {
  roomName: string
  participantsCount: number
  isEncryptionReady: boolean
  isMobileView: boolean
  onToggleLeftSidebar: () => void
  onToggleRightSidebar: () => void
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  roomName,
  participantsCount,
  isEncryptionReady,
  isMobileView,
  onToggleLeftSidebar,
  onToggleRightSidebar,
}) => {
  return (
    <div className="bg-black p-4 border-b border-[#1a1a1a] flex justify-between items-center min-h-[72px]">
      <div className="flex items-center gap-3">
        {isMobileView && (
          <button
            onClick={onToggleLeftSidebar}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-white font-semibold shadow-lg">
          {roomName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <h2 className="font-semibold text-white text-lg tracking-tight">{roomName}</h2>
          <div className="text-xs text-gray-400 font-light flex items-center gap-2">
            <span>
              {participantsCount} {participantsCount === 1 ? "participant" : "participants"}
            </span>
            {isEncryptionReady && (
              <>
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                <span className="text-green-400">🔒 Encrypted</span>
              </>
            )}
          </div>
        </div>
      </div>
      {isMobileView && (
        <button
          onClick={onToggleRightSidebar}
          className="w-10 h-10 rounded-lg border border-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#FF4D00] hover:border-[#FF4D00]/30 transition-colors"
        >
          <Users size={18} />
        </button>
      )}
    </div>
  )
}

export default ChatHeader
