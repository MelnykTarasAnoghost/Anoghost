import type React from "react"

interface ParticipantsListProps {
  participants: Array<{ nickname: string; joinedAt: number }>
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ participants }) => {
  // Sort participants by join time (oldest first)
  const sortedParticipants = [...participants].sort((a, b) => a.joinedAt - b.joinedAt)

  return (
    <div className="space-y-2">
      {sortedParticipants.map((participant, index) => (
        <div key={index} className="flex items-center p-2 rounded-md hover:bg-[#1a1a1a] transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-black font-medium mr-3">
            {participant.nickname.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm text-white">{participant.nickname}</p>
            {index === 0 && <p className="text-xs text-[#FF4D00]">Room Creator</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ParticipantsList
