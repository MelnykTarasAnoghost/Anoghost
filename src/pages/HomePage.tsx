"use client"

import { useNavigate } from "react-router-dom"
import { useWallet } from "@solana/wallet-adapter-react"
import { useState, useRef, useEffect } from "react"
import JoinRoomModal from "../components/JoinRoomModal"
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Lock,
  Shield,
  Ghost,
  Hash,
  Sparkles,
  RefreshCw,
  Copy,
  LogOut,
  ChevronDown,
} from "lucide-react"
import GhostIdDisplay from "../components/GhostIdDisplay"
import CustomWalletSelector from "../components/CustomWalletSelector"

const HomePage = () => {
  const navigate = useNavigate()
  const { connected, disconnect } = useWallet()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [activeSlide, setActiveSlide] = useState(1)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

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

  const handleRefreshGhostId = () => {
    // Access the ghostIdMethods from window
    if (window && (window as any).ghostIdMethods) {
      ;(window as any).ghostIdMethods.refresh()
    }
    setDropdownOpen(false)
  }

  const handleCopyGhostId = () => {
    // Access the ghostIdMethods from window
    if (window && (window as any).ghostIdMethods) {
      ;(window as any).ghostIdMethods.copy()
    }
    setDropdownOpen(false)
  }

  const handleDisconnectWallet = () => {
    disconnect()
    setDropdownOpen(false)
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 py-4 px-6 transition-all duration-300 ${
          isScrolled ? "bg-[#0A0A0A]/90 backdrop-blur-md shadow-md" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="border border-[#333333] rounded-full px-6 py-2 flex items-center">
              <Ghost className="mr-2 text-[#FF4D00]" size={16} />
              <span className="text-sm font-medium tracking-wide">ANoGhost</span>
            </div>
          </div>

          {connected ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="border border-[#333333] rounded-full px-4 py-2 flex items-center hover:border-[#FF4D00] transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-2">Ghost ID:</span>
                  <GhostIdDisplay />
                </div>
                <ChevronDown size={14} className={`ml-2 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#111111] border border-[#333333] rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="py-1">
                    <button
                      onClick={handleRefreshGhostId}
                      className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
                    >
                      <RefreshCw size={14} className="mr-2 text-[#FF4D00]" />
                      Refresh Ghost ID
                    </button>
                    <button
                      onClick={handleCopyGhostId}
                      className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
                    >
                      <Copy size={14} className="mr-2 text-[#FF4D00]" />
                      Copy Ghost ID
                    </button>
                    <div className="border-t border-[#333333] my-1"></div>
                    <button
                      onClick={handleDisconnectWallet}
                      className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
                    >
                      <LogOut size={14} className="mr-2 text-[#FF4D00]" />
                      Disconnect Wallet
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <CustomWalletSelector />
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center pt-24">
        {/* Background circles */}
        <div className="absolute w-[800px] h-[800px] bg-gradient-to-tr from-[#FF4D00] to-transparent blur-2xl rounded-full border border-[#333333] opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-[#521a01] to-transparent blur-xl rounded-full border border-[#333333] opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute w-[400px] h-[400px] bg-gradient-to-r from-[#2b0e01] to-transparent blur-lg rounded-full border border-[#333333] opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>

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

          <div className="mt-10 flex justify-center space-x-4">
            {connected ? (
              <>
                <button
                  onClick={handleCreateChatRoom}
                  className="h-12 px-6 rounded-full bg-[#FF4D00] text-black flex items-center justify-center hover:opacity-90 transition-colors font-medium"
                >
                  Create Room <ArrowUpRight size={18} className="ml-2" />
                </button>
                <button
                  onClick={handleJoinChat}
                  className="h-12 px-6 rounded-full border border-[#333333] flex items-center justify-center hover:border-[#FF4D00] hover:text-[#FF4D00] transition-colors font-medium"
                >
                  Join Room <ArrowUpRight size={18} className="ml-2" />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  const walletButton = document.querySelector(".custom-wallet-button") as HTMLButtonElement | null
                  if (walletButton) walletButton.click()
                }}
                className="h-12 px-6 rounded-full bg-[#FF4D00] text-black flex items-center justify-center hover:opacity-90 transition-colors font-medium"
              >
                Connect Wallet <ArrowUpRight size={18} className="ml-2" />
              </button>
            )}
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
