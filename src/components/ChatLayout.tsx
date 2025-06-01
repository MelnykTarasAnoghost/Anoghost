"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobileView()
    window.addEventListener("resize", checkMobileView)
    return () => {
      window.removeEventListener("resize", checkMobileView)
    }
  }, [])

  const participants = roomData.participants || [];

  useEffect(() => {
      console.log("ChatLayout re-rendered. Received roomData.participants count:", participants.length, "Data:", JSON.parse(JSON.stringify(participants)));
    }, [participants]);

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden">
      <div
        className={`${
          isMobileLeftSidebarOpen
            ? "fixed inset-0 z-50 flex flex-col w-full md:w-64 md:static"
            : "hidden md:flex md:w-64"
        } border-r border-[#1a1a1a] bg-[#0A0A0A] flex-col`}
      >
        <LeftSidebar
          roomData={roomData}
          nickname={nickname}
          onClose={() => setIsMobileLeftSidebarOpen(false)}
          participants={participants}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <ChatArea
          roomData={{
            ...roomData,
            participants: participants,
          }}
          nickname={nickname}
          onToggleLeftSidebar={() => setIsMobileLeftSidebarOpen(!isMobileLeftSidebarOpen)}
          onToggleRightSidebar={() => setIsMobileRightSidebarOpen(!isMobileRightSidebarOpen)}
          isCreator={isCreator}
        />
      </div>

      <div
        className={`${
          isMobileRightSidebarOpen
            ? "fixed inset-0 z-50 flex flex-col w-full md:w-80 md:static"
            : "hidden md:flex md:w-80"
        } border-l border-[#1a1a1a] bg-[#0A0A0A] flex-col`}
      >
        <RightSidebar
          roomData={roomData}
          participants={participants}
          pendingParticipants={pendingParticipants}
          isCreator={isCreator}
          onClose={() => setIsMobileRightSidebarOpen(false)}
          onNftGenerated={onNftGenerated}
        />
      </div>

      {(isMobileLeftSidebarOpen || isMobileRightSidebarOpen) && isMobile && (
        <div
          className="fixed inset-0 bg-black/70 z-40"
          onClick={() => {
            setIsMobileLeftSidebarOpen(false)
            setIsMobileRightSidebarOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default ChatLayout