"use client"

import type React from "react"

interface TypingIndicatorProps {
  typingUsers: string[]
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null

  let message: string
  if (typingUsers.length === 1) {
    message = `${typingUsers[0]} is typing...`
  } else if (typingUsers.length === 2) {
    message = `${typingUsers[0]} and ${typingUsers[1]} are typing...`
  } else {
    message = `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`
  }

  return (
    <div className="flex items-center py-1 px-3 text-xs text-gray-400 font-light bg-[#1a1a1a] rounded-full w-fit">
      <div className="flex space-x-1 mr-2">
        <div className="w-1 h-1 rounded-full bg-[#FF4D00] animate-bounce" style={{ animationDelay: "0ms" }}></div>
        <div className="w-1 h-1 rounded-full bg-[#FF4D00] animate-bounce" style={{ animationDelay: "150ms" }}></div>
        <div className="w-1 h-1 rounded-full bg-[#FF4D00] animate-bounce" style={{ animationDelay: "300ms" }}></div>
      </div>
      {message}
    </div>
  )
}

export default TypingIndicator
