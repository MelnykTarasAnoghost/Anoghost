import type React from "react"
import { X } from "lucide-react"
import PendingRequests from "./PendingRequests"
import NftMinter from "./NftMinter"

interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  participants: Array<{ nickname: string; joinedAt: number }>
}

interface RightSidebarProps {
  roomData: RoomData
  pendingParticipants: Array<{ id: string; nickname: string; requestedAt: number }>
  isCreator: boolean
  onClose: () => void
  onNftGenerated: (nft: any) => void
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  roomData,
  pendingParticipants,
  isCreator,
  onClose,
  onNftGenerated,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="font-medium text-white">Room Details</h2>
        </div>
        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Room Information */}
          <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
            <div className="p-3 bg-[#1a1a1a]">
              <h3 className="text-sm font-medium text-white">Room Information</h3>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Room Name</p>
                <p className="text-sm font-medium text-white">{roomData.roomName}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Room ID</p>
                <p className="text-xs font-mono truncate text-white">{roomData.roomId}</p>
              </div>

              {roomData.accessToken && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Access Token</p>
                  <p className="text-xs font-mono truncate text-white">{roomData.accessToken.substring(0, 20)}...</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Requests Section */}
          {isCreator && pendingParticipants.length > 0 && (
            <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
              <div className="p-3 bg-[#1a1a1a]">
                <h3 className="text-sm font-medium text-white">Pending Requests ({pendingParticipants.length})</h3>
              </div>

              <div className="p-4">
                <PendingRequests roomId={roomData.roomId} pendingParticipants={pendingParticipants} />
              </div>
            </div>
          )}

          {/* NFT Minter */}
          <NftMinter roomData={roomData} onNftGenerated={onNftGenerated} />
        </div>
      </div>
    </div>
  )
}

export default RightSidebar
