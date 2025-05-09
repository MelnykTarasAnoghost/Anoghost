"use client"

import { useNavigate } from "react-router-dom"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useState } from "react"
import JoinRoomModal from "../components/JoinRoomModal"
import { ArrowRight, ArrowLeft, ArrowUpRight, ChevronRight, Lock, Shield, Ghost, Hash, Sparkles } from "lucide-react"

const HomePage = () => {
  const navigate = useNavigate()
  const { connected } = useWallet()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [activeSlide, setActiveSlide] = useState(1)

  const handleCreateChatRoom = () => {
    navigate("/r")
  }

  const handleJoinChat = () => {
    setIsJoinModalOpen(true)
  }

  const handleJoinSuccess = (roomData: any) => {
    navigate("/r", { state: { roomData } })
  }

  const handleJoinPending = (roomInfo: { roomId: string; roomName: string }) => {
    navigate("/r", { state: { isPendingApproval: true, pendingRoomInfo: roomInfo } })
  }

  const nextSlide = () => {
    setActiveSlide((prev) => (prev === 3 ? 1 : prev + 1))
  }

  const prevSlide = () => {
    setActiveSlide((prev) => (prev === 1 ? 3 : prev - 1))
  }

  const testimonials = [
    {
      id: 1,
      text: "ANoGhost provides true privacy for crypto communities. No emails, no phone numbers, just wallet-based authentication.",
    },
    {
      id: 2,
      text: "The self-destructing messages and NFT-gated rooms make this perfect for sharing alpha with trusted communities.",
    },
    {
      id: 3,
      text: "Privacy-first approach and zero tracking make this the ideal solution for DAOs and early-stage communities.",
    },
  ]

  const currentDate = new Date()
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="border border-[#333333] rounded-full px-6 py-2 flex items-center">
              <Ghost className="mr-2 text-[#FF4D00]" size={16} />
              <span className="text-sm font-medium tracking-wide">ANoGhost</span>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-white text-sm hover:text-[#FF4D00] transition-colors tracking-wide">
              Features
            </a>
            <a href="#" className="text-gray-400 text-sm hover:text-white transition-colors tracking-wide">
              Privacy
            </a>
            <a href="#" className="text-gray-400 text-sm hover:text-white transition-colors tracking-wide">
              Security
            </a>
            <a href="#" className="text-gray-400 text-sm hover:text-white transition-colors tracking-wide">
              Community
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <div className="border border-[#333333] rounded-full px-4 py-2 text-sm">{formattedDate}</div>
            {connected ? (
              <button
                onClick={handleCreateChatRoom}
                className="border border-[#333333] rounded-full px-4 py-2 text-sm flex items-center hover:border-[#FF4D00] hover:text-[#FF4D00] transition-colors"
              >
                Enter App <ChevronRight size={16} className="ml-1" />
              </button>
            ) : (
              <WalletMultiButton className="!border !border-[#333333] !rounded-full !px-4 !py-2 !text-sm !flex !items-center !bg-transparent !hover:border-[#FF4D00]" />
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center pt-24">
        {/* Background circles */}
        <div className="absolute w-[800px] h-[800px] rounded-full border border-[#333333] opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute w-[600px] h-[600px] rounded-full border border-[#333333] opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute w-[400px] h-[400px] rounded-full border border-[#333333] opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>

        {/* Stats */}
        <div className="absolute top-1/2 left-[10%] transform -translate-y-1/2 text-left">
          <div className="p-4">
            <h3 className="text-4xl font-bold">1k+</h3>
            <p className="text-gray-400 text-sm mt-1">Awards</p>
            <div className="w-16 h-px bg-[#333333] my-6"></div>
            <h3 className="text-4xl font-bold">221k</h3>
            <p className="text-gray-400 text-sm mt-1">Transactions</p>
          </div>
        </div>

        <div className="absolute top-1/2 right-[10%] transform -translate-y-1/2 text-left">
          <div className="p-4">
            <h3 className="text-4xl font-bold">100%</h3>
            <p className="text-gray-400 text-sm mt-1">Privacy</p>
            <div className="w-16 h-px bg-[#333333] my-6"></div>
            <h3 className="text-4xl font-bold">0</h3>
            <p className="text-gray-400 text-sm mt-1">Data tracked</p>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-[5%] top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full border border-[#333333] flex items-center justify-center hover:border-[#FF4D00] hover:text-[#FF4D00] transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-[5%] top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full border border-[#333333] flex items-center justify-center hover:border-[#FF4D00] hover:text-[#FF4D00] transition-colors"
        >
          <ArrowRight size={16} />
        </button>

        {/* Center content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-block mb-6 px-4 py-2 rounded-full border border-[#333333]">
            <p className="text-sm opacity-70 flex items-center">
              <Sparkles size={14} className="mr-2 text-[#FF4D00]" />
              Privacy-first, wallet-based chat for crypto-native users
            </p>
          </div>

          <h1 className="text-5xl md:text-7xl font-medium leading-tight mb-6 tracking-tight">
            <Ghost className="inline-block text-[#FF4D00]" size={40} /> <span className="gradient-text">ANoGhost</span>{" "}
            <br />
            Anonymous <Hash className="inline-block text-[#FF4D00]" size={40} />{" "}
            <span className="gradient-text">Web3</span> messaging
          </h1>

          <p className="text-gray-300 max-w-2xl mx-auto mt-6 text-lg">
            Join anonymously via wallet authentication. Create temporary rooms, DAO boards, or NFT-gated spaces.
            Messages can self-destruct, with zero tracking of personal data.
          </p>

          <div className="mt-10 flex justify-center">
            <button className="w-12 h-12 rounded-full border border-[#333333] flex items-center justify-center hover:border-[#FF4D00] hover:text-[#FF4D00] transition-colors">
              <ArrowUpRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Testimonial Slider */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-3 gap-6">
          <div className="border border-[#333333] rounded-xl p-6 flex items-center">
            <div className="flex space-x-4">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => setActiveSlide(num)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    activeSlide === num
                      ? "bg-[#FF4D00] text-black"
                      : "border border-[#333333] text-white hover:border-[#FF4D00] hover:text-[#FF4D00]"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FF4D00] text-black rounded-xl p-6 col-span-2 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => setActiveSlide(num)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    activeSlide === num
                      ? "bg-black text-[#FF4D00]"
                      : "border border-black/20 text-black hover:bg-black/10"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="flex-1 mx-6 font-medium">{testimonials.find((t) => t.id === activeSlide)?.text}</p>
            <button className="w-12 h-12 rounded-full border border-black/20 flex items-center justify-center hover:bg-black/10 transition-colors">
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-[#333333] rounded-xl p-6 hover:border-[#FF4D00] transition-colors">
            <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center mb-4 border border-[#222222]">
              <Lock size={24} className="text-[#FF4D00]" />
            </div>
            <h3 className="text-xl font-medium mb-2 tracking-tight hover:text-[#FF4D00] transition-colors">
              Privacy-First
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              No emails, phone numbers, or IP tracking. Just connect your wallet and start chatting anonymously.
            </p>
          </div>

          <div className="border border-[#333333] rounded-xl p-6 hover:border-[#FF4D00] transition-colors">
            <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center mb-4 border border-[#222222]">
              <Shield size={24} className="text-[#FF4D00]" />
            </div>
            <h3 className="text-xl font-medium mb-2 tracking-tight hover:text-[#FF4D00] transition-colors">
              Self-Destructing
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Set messages to automatically delete after a specified time. Perfect for sharing sensitive information.
            </p>
          </div>

          <div className="border border-[#333333] rounded-xl p-6 hover:border-[#FF4D00] transition-colors">
            <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center mb-4 border border-[#222222]">
              <Hash size={24} className="text-[#FF4D00]" />
            </div>
            <h3 className="text-xl font-medium mb-2 tracking-tight hover:text-[#FF4D00] transition-colors">
              NFT-Gated Rooms
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Create exclusive spaces for NFT holders or token owners. Perfect for DAOs and exclusive communities.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="fixed bottom-6 left-0 right-0 z-50">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-black/50 border border-[#333333] rounded-full p-2 flex items-center justify-between">
            <div className="flex items-center space-x-4 pl-4">
              <Ghost size={16} className="text-[#FF4D00]" />
              <span className="text-sm">Anonymous Web3 messaging</span>
            </div>
            <div className="flex space-x-2">
              {connected ? (
                <>
                  <button
                    onClick={handleCreateChatRoom}
                    className="bg-[#FF4D00] text-black rounded-full px-6 py-2 text-sm font-medium hover:opacity-90 transition-colors"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={handleJoinChat}
                    className="bg-transparent rounded-full px-6 py-2 text-sm font-medium transition-colors border border-[#333333] hover:border-[#FF4D00] hover:text-[#FF4D00]"
                  >
                    Join Room
                  </button>
                </>
              ) : (
                <WalletMultiButton className="!bg-[#FF4D00] !text-black !rounded-full !px-6 !py-2 !text-sm !font-medium !hover:opacity-90 !transition-colors" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Join Room Modal */}
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
