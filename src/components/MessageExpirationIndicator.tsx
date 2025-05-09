"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

interface MessageExpirationIndicatorProps {
  expiresAt: number | undefined
  onExpired?: () => void
}

const MessageExpirationIndicator: React.FC<MessageExpirationIndicatorProps> = ({ expiresAt, onExpired }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null)
      return
    }

    const updateTimeLeft = () => {
      const now = Date.now()
      const remaining = expiresAt - now

      if (remaining <= 0) {
        setTimeLeft("Expired")
        setProgress(0)
        if (onExpired) onExpired()
        return
      }

      // Calculate time remaining
      const seconds = Math.floor((remaining / 1000) % 60)
      const minutes = Math.floor((remaining / (1000 * 60)) % 60)
      const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24)
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24))

      // Format time remaining
      let formattedTime = ""
      if (days > 0) {
        formattedTime = `${days}d ${hours}h`
      } else if (hours > 0) {
        formattedTime = `${hours}h ${minutes}m`
      } else if (minutes > 0) {
        formattedTime = `${minutes}m ${seconds}s`
      } else {
        formattedTime = `${seconds}s`
      }

      setTimeLeft(formattedTime)

      // Calculate progress for visual indicator
      const totalDuration = expiresAt - (now - 60000) // Approximate starting point
      const elapsed = totalDuration - remaining
      const calculatedProgress = Math.max(0, 100 - (elapsed / totalDuration) * 100)
      setProgress(calculatedProgress)
    }

    // Update immediately
    updateTimeLeft()

    // Then update every second
    const interval = setInterval(updateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

  if (!expiresAt || !timeLeft) {
    return null
  }

  // Determine color based on time remaining
  const getColorClass = () => {
    if (progress < 25) return "text-[#FF4D00]"
    if (progress < 50) return "text-[#FF4D00]"
    return "text-gray-400"
  }

  return (
    <div className="flex items-center space-x-1">
      <Clock size={12} className={getColorClass()} />
      <span className={`text-xs ${getColorClass()} font-light`}>{timeLeft}</span>
    </div>
  )
}

export default MessageExpirationIndicator
