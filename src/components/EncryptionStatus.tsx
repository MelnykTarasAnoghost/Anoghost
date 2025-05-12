"use client"

import type React from "react"
import { useState } from "react"
import { Lock, Shield, X } from "lucide-react"

interface EncryptionStatusProps {
  isEncryptionReady: boolean
  participantCount: number
  encryptedParticipantCount: number
}

const EncryptionStatus: React.FC<EncryptionStatusProps> = ({
  isEncryptionReady,
  participantCount,
  encryptedParticipantCount,
}) => {
  const [showDetails, setShowDetails] = useState(false)

  // Calculate encryption percentage
  const encryptionPercentage =
    participantCount > 0 ? Math.round((encryptedParticipantCount / participantCount) * 100) : 0

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center text-xs text-gray-400 hover:text-[#FF4D00] transition-colors font-light"
      >
        <Lock size={14} className="mr-1" />
        {isEncryptionReady ? "Encrypted" : "Setting up encryption..."}
      </button>

      {showDetails && (
        <div className="absolute bottom-full left-0 mb-2 p-4 bg-[#1a1a1a] rounded-lg border border-[#333333] text-xs w-72 z-10">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-white flex items-center tracking-tight">
              <Shield size={14} className="mr-2 text-[#FF4D00]" />
              End-to-End Encryption Status
            </h4>
            <button
              onClick={() => setShowDetails(false)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-white border border-[#333333]"
            >
              <X size={12} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="border border-[#333333] p-3 rounded-lg">
              <div className="flex justify-between mb-1">
                <span className="text-gray-400 flex items-center font-light">Encryption Setup:</span>
                <span className={isEncryptionReady ? "text-white" : "text-[#FF4D00]"}>
                  {isEncryptionReady ? "Ready" : "In Progress"}
                </span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-gray-400 flex items-center font-light">Encrypted Participants:</span>
                <span className="text-white">
                  {encryptedParticipantCount}/{participantCount} ({encryptionPercentage}%)
                </span>
              </div>

              <div className="w-full bg-[#333333] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#FF4D00] h-1.5 rounded-full transition-all"
                  style={{ width: `${encryptionPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="border border-[#333333] p-3 rounded-lg flex items-start">
              <p className="text-gray-300 text-xs leading-relaxed font-light">
                {isEncryptionReady
                  ? "Your messages are encrypted end-to-end and can only be read by participants in this room."
                  : "Encryption keys are being generated and exchanged. Some messages may not be fully encrypted yet."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EncryptionStatus
