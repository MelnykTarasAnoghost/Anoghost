"use client"

import { useNavigate } from "react-router-dom"
import { useState } from "react"
import JoinRoomModal from "../components/JoinRoomModal"
import HomeHeader from "../components/home/HomeHeader"
import HomeHero from "../components/home/HomeHero"
import HomeTestimonials from "../components/home/HomeTestimonials"
import HomeFeatures from "../components/home/HomeFeatures"

const HomePage = () => {
  const navigate = useNavigate()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  const handleJoinChat = () => {
    setIsJoinModalOpen(true)
  }

  const handleJoinSuccess = (roomData: any) => {
    navigate("/r", { state: { roomData } })
  }

  const handleJoinPending = (roomInfo: { roomId: string; roomName: string }) => {
    navigate("/r", { state: { isPendingApproval: true, pendingRoomInfo: roomInfo } })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <HomeHeader />
      <HomeHero onJoinChat={handleJoinChat} />
      <HomeTestimonials />
      <HomeFeatures />

      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinSuccess={handleJoinSuccess}
        onJoinPending={handleJoinPending}
      />
    </div>
  )
}

export default HomePage