"use client"

import type React from "react"
import { Users, Search, X, Shield, Clock } from "lucide-react"
import { useState } from "react"

interface ParticipantsListProps {
  participants: Array<{ nickname: string; joinedAt: number }>
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ participants }) => {
  const [searchTerm, setSearchTerm] = useState("")

  // Format timestamp to readable time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Filter participants based on search term
  const filteredParticipants = participants.filter((participant) =>
    participant.nickname.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-medium text-sm tracking-tight flex items-center">
          <Users size={14} className="mr-2 text-[#FF4D00]" />
          Participants ({participants.length})
        </h3>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search participants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 pl-8 rounded-lg bg-[#1a1a1a] text-white border-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00] transition-colors text-sm font-light"
        />
        <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Search size={14} />
        </div>
        {searchTerm && (
          <button
            className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#FF4D00] transition-colors"
            onClick={() => setSearchTerm("")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1a1a1a] scrollbar-track-black">
        {filteredParticipants.length > 0 ? (
          filteredParticipants.map((participant, index) => (
            <div key={index} className="flex items-center p-3 rounded-lg bg-[#1a1a1a] transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-black font-medium mr-3">
                {participant.nickname.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{participant.nickname}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-gray-400 text-xs flex items-center font-light">
                    <Clock size={10} className="mr-1" />
                    {formatTime(participant.joinedAt)}
                  </p>
                  <p className="text-gray-400 text-xs flex items-center font-light">
                    <Shield size={10} className="mr-1" />
                    Encrypted
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-400">
            <Search size={24} className="mx-auto mb-2 opacity-50" />
            <p>No participants found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ParticipantsList
