"use client"

import type React from "react"

import { Copy, Key } from "lucide-react"

interface JoinMethodTabsProps {
  joinMethod: "roomId" | "nftAccess"
  onMethodChange: (method: "roomId" | "nftAccess") => void
  onError: (error: string | null) => void
}

const JoinMethodTabs: React.FC<JoinMethodTabsProps> = ({ joinMethod, onMethodChange, onError }) => {
  const handleMethodChange = (method: "roomId" | "nftAccess") => {
    onMethodChange(method)
    onError(null)
  }

  return (
    <div className="flex border-b border-[#333333] mb-6">
      <button
        onClick={() => handleMethodChange("roomId")}
        className={`flex-1 py-2.5 text-sm font-medium relative ${
          joinMethod === "roomId" ? "text-white" : "text-gray-400 hover:text-gray-300"
        }`}
      >
        <div className="flex items-center justify-center">
          <Copy size={15} className="mr-2" />
          Room ID
        </div>
        {joinMethod === "roomId" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF4D00]"></div>}
      </button>
      <button
        onClick={() => handleMethodChange("nftAccess")}
        className={`flex-1 py-2.5 text-sm font-medium relative ${
          joinMethod === "nftAccess" ? "text-white" : "text-gray-400 hover:text-gray-300"
        }`}
      >
        <div className="flex items-center justify-center">
          <Key size={15} className="mr-2" />
          NFT Access
        </div>
        {joinMethod === "nftAccess" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF4D00]"></div>}
      </button>
    </div>
  )
}

export default JoinMethodTabs
