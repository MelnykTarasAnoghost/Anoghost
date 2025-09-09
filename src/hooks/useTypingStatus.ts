"use client"

import { useState, useEffect, useRef } from "react"

// Custom hook to handle typing status
export const useTypingStatus = (roomId: string, inputValue: string) => {
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear the timeout when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Monitor input value changes to detect typing
  useEffect(() => {
    // If the user is typing and wasn't before, send typing status
    if (inputValue && !isTyping) {
      setIsTyping(true)
      // sendTypingStatus(roomId, true); // Removed socket call to avoid circular dependency
    }

    // Reset the timeout on each keystroke
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set a timeout to stop typing status after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        // sendTypingStatus(roomId, false); // Removed socket call to avoid circular dependency
      }
    }, 2000)
  }, [inputValue, isTyping, roomId])

  return isTyping
}
