"use client"

import type React from "react"
import { useState } from "react"
import LeftSidebar from "./LeftSidebar"
import ChatArea from "./ChatArea"
import RightSidebar from "./RightSidebar"

interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  participants: Array<{ nickname: string; joinedAt: number }>
}

interface ChatLayoutProps {
  roomData: RoomData
  nickname: string
  pendingParticipants: Array<{ id: string; nickname: string; requestedAt: number }>
  isCreator: boolean
  mockNfts: any[]
  onNftGenerated: (nft: any) => void
}

// Update the ChatLayout component to take full screen width
const ChatLayout: React.FC<ChatLayoutProps> = ({
  roomData,
  nickname,
  pendingParticipants,
  isCreator,
  mockNfts,
  onNftGenerated,
}) => {
  const [isMobileLeftSidebarOpen, setIsMobileLeftSidebarOpen] = useState(false)
  const [isMobileRightSidebarOpen, setIsMobileRightSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-black overflow-hidden border border-[#1a1a1a] w-full">
      {/* Left Sidebar - hidden on mobile unless toggled */}
      <div
        className={`w-64 border-r border-[#1a1a1a] bg-[#0A0A0A] md:flex flex-col ${
          isMobileLeftSidebarOpen ? "flex absolute left-0 top-0 bottom-0 z-20" : "hidden"
        }`}
      >
        <LeftSidebar
          roomData={roomData}
          nickname={nickname}
          onClose={() => setIsMobileLeftSidebarOpen(false)}
          mockNfts={mockNfts}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea
          roomData={roomData}
          nickname={nickname}
          onToggleLeftSidebar={() => setIsMobileLeftSidebarOpen(!isMobileLeftSidebarOpen)}
          onToggleRightSidebar={() => setIsMobileRightSidebarOpen(!isMobileRightSidebarOpen)}
        />
      </div>

      {/* Right Sidebar - hidden on mobile unless toggled */}
      <div
        className={`w-80 border-l border-[#1a1a1a] bg-[#0A0A0A] md:flex flex-col ${
          isMobileRightSidebarOpen ? "flex absolute right-0 top-0 bottom-0 z-20" : "hidden"
        }`}
      >
        <RightSidebar
          roomData={roomData}
          pendingParticipants={pendingParticipants}
          isCreator={isCreator}
          onClose={() => setIsMobileRightSidebarOpen(false)}
          onNftGenerated={onNftGenerated}
        />
      </div>
    </div>
  )
}

export default ChatLayout
