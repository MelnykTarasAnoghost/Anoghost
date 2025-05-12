"use client"

import type React from "react"
import { useState } from "react"
import { approveJoinRequest, rejectJoinRequest } from "../services/socket"

interface PendingRequestsProps {
  roomId: string
  pendingParticipants: Array<{ id: string; nickname: string; requestedAt: number }>
}

const PendingRequests: React.FC<PendingRequestsProps> = ({ roomId, pendingParticipants }) => {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  // Format timestamp to readable time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleApprove = async (participantId: string) => {
    // Add to processing set to show loading state
    setProcessingIds((prev) => new Set([...prev, participantId]))

    try {
      const result = await approveJoinRequest(roomId, participantId)
      if (!result.success) {
        console.error("Failed to approve join request:", result.error)
      }
    } catch (error) {
      console.error("Error approving join request:", error)
    } finally {
      // Remove from processing set
      setProcessingIds((prev) => {
        const newSet = new Set([...prev])
        newSet.delete(participantId)
        return newSet
      })
    }
  }

  const handleReject = async (participantId: string) => {
    // Add to processing set to show loading state
    setProcessingIds((prev) => new Set([...prev, participantId]))

    try {
      const result = await rejectJoinRequest(roomId, participantId)
      if (!result.success) {
        console.error("Failed to reject join request:", result.error)
      }
    } catch (error) {
      console.error("Error rejecting join request:", error)
    } finally {
      // Remove from processing set
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
    <div className="mb-4 p-4 bg-black rounded-lg border border-[#1a1a1a]">
      <h3 className="text-sm font-semibold mb-3 text-[#FF4D00]">Pending Join Requests</h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {pendingParticipants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between bg-[#111111] p-3 rounded-lg border border-[#1a1a1a]"
          >
            <div>
              <p className="text-sm font-medium text-white">{participant.nickname}</p>
              <p className="text-xs text-gray-400">Requested at {formatTime(participant.requestedAt)}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleApprove(participant.id)}
                disabled={processingIds.has(participant.id)}
                className="text-xs bg-[#00c853] text-white py-1 px-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingIds.has(participant.id) ? "..." : "Approve"}
              </button>
              <button
                onClick={() => handleReject(participant.id)}
                disabled={processingIds.has(participant.id)}
                className="text-xs bg-[#FF4D00] text-white py-1 px-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingIds.has(participant.id) ? "..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PendingRequests
