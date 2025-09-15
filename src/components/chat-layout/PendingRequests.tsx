"use client"

import type React from "react"
import { useState } from "react"
import { Clock, Check, X } from "lucide-react"
import { approveJoinRequest, rejectJoinRequest } from "@/services/socket"

interface PendingRequestsProps {
  roomId: string
  pendingParticipants: Array<{ id: string; nickname: string; requestedAt: number }>
}

const PendingRequests: React.FC<PendingRequestsProps> = ({ roomId, pendingParticipants }) => {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleApprove = async (participantId: string) => {
    setProcessingIds((prev) => new Set([...prev, participantId]))

    try {
      const result = await approveJoinRequest(roomId, participantId)
      if (!result.success) {
        console.error("Failed to approve join request:", result.error)
      }
    } catch (error) {
      console.error("Error approving join request:", error)
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set([...prev])
        newSet.delete(participantId)
        return newSet
      })
    }
  }

  const handleReject = async (participantId: string) => {
    setProcessingIds((prev) => new Set([...prev, participantId]))

    try {
      const result = await rejectJoinRequest(roomId, participantId)
      if (!result.success) {
        console.error("Failed to reject join request:", result.error)
      }
    } catch (error) {
      console.error("Error rejecting join request:", error)
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set([...prev])
        newSet.delete(participantId)
        return newSet
      })
    }
  }

  if (!pendingParticipants || pendingParticipants.length === 0) {
    return null
  }

  return (
    <div className="p-3 bg-gradient-to-r from-[#1a1a1a]/50 to-[#222222]/50 rounded-xl border border-[#FF4D00]/20 backdrop-blur-sm animate-slideIn">
      <div className="flex items-center mb-3">
        <Clock size={14} className="text-[#FF4D00] mr-2" />
        <h3 className="text-sm font-semibold text-[#FF4D00]">Pending Requests</h3>
        <div className="ml-2 bg-[#FF4D00] text-black text-xs font-bold py-0.5 px-1.5 rounded-full">
          {pendingParticipants.length}
        </div>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
        {pendingParticipants.map((participant, index) => (
          <div
            key={participant.id}
            className="flex items-center justify-between bg-gradient-to-r from-[#111111] to-[#1a1a1a] p-2.5 rounded-lg border border-[#333333]/50 hover:border-[#FF4D00]/30 transition-all duration-300 animate-slideIn group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold mr-2.5 shadow-md flex-shrink-0">
                {participant.nickname.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{participant.nickname}</p>
                <div className="flex items-center text-xs text-gray-400">
                  <Clock size={8} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{formatTime(participant.requestedAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-1.5 flex-shrink-0">
              <button
                onClick={() => handleApprove(participant.id)}
                disabled={processingIds.has(participant.id)}
                className="flex items-center justify-center w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Approve"
              >
                {processingIds.has(participant.id) ? (
                  <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={12} />
                )}
              </button>
              <button
                onClick={() => handleReject(participant.id)}
                disabled={processingIds.has(participant.id)}
                className="flex items-center justify-center w-7 h-7 bg-transparent border border-red-500/50 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reject"
              >
                {processingIds.has(participant.id) ? (
                  <div className="w-2.5 h-2.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <X size={12} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PendingRequests
