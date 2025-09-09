"use client"

import type React from "react"
import { useState } from "react"
import { Clock, Check, X } from "lucide-react"
import { approveJoinRequest, rejectJoinRequest } from "../../services/socket"

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
    <div className="mb-6 p-4 bg-gradient-to-r from-[#1a1a1a]/50 to-[#222222]/50 rounded-xl border border-[#FF4D00]/20 backdrop-blur-sm animate-slideIn">
      <div className="flex items-center mb-4">
        <Clock size={16} className="text-[#FF4D00] mr-2" />
        <h3 className="text-sm font-semibold text-[#FF4D00]">Pending Join Requests</h3>
        <div className="ml-2 bg-[#FF4D00] text-black text-xs font-bold py-1 px-2 rounded-full">
          {pendingParticipants.length}
        </div>
      </div>

      <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
        {pendingParticipants.map((participant, index) => (
          <div
            key={participant.id}
            className="flex items-center justify-between bg-gradient-to-r from-[#111111] to-[#1a1a1a] p-4 rounded-lg border border-[#333333]/50 hover:border-[#FF4D00]/30 transition-all duration-300 animate-slideIn group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold mr-3 shadow-md">
                {participant.nickname.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{participant.nickname}</p>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <Clock size={10} className="mr-1" />
                  <span>Requested at {formatTime(participant.requestedAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleApprove(participant.id)}
                disabled={processingIds.has(participant.id)}
                className="flex items-center justify-center w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105"
                title="Approve request"
              >
                {processingIds.has(participant.id) ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </button>
              <button
                onClick={() => handleReject(participant.id)}
                disabled={processingIds.has(participant.id)}
                className="flex items-center justify-center w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105"
                title="Reject request"
              >
                {processingIds.has(participant.id) ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <X size={14} />
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
