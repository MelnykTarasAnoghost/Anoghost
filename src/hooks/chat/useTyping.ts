"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { getSocket } from "../../services/socket"

interface UseTypingOptions {
  roomId: string
  nickname: string
  throttleMs?: number // optional, default 3000ms
}

export function useTyping({ roomId, nickname, throttleMs = 3000 }: UseTypingOptions) {
  const socket = getSocket()
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const isTypingRef = useRef(false)
  const lastSentRef = useRef(0)
  const stopTypingTimeout = useRef<NodeJS.Timeout | null>(null)

  const sendTypingStatus = useCallback(
    (typing: boolean = true) => {
      if (!socket) return

      if (typing) {
        const now = Date.now()
        if (now - lastSentRef.current > throttleMs || !isTypingRef.current) {
          socket.emit("userTyping", { roomId })
          lastSentRef.current = now
          isTypingRef.current = true
        }

        if (stopTypingTimeout.current) clearTimeout(stopTypingTimeout.current)
        stopTypingTimeout.current = setTimeout(() => {
          socket.emit("userStoppedTyping", { roomId })
          isTypingRef.current = false
        }, throttleMs)
      } else {
        // Stop typing immediately
        if (stopTypingTimeout.current) clearTimeout(stopTypingTimeout.current)
        socket.emit("userStoppedTyping", { roomId })
        isTypingRef.current = false
      }
    },
    [socket, roomId, throttleMs]
  )

  useEffect(() => {
    if (!socket) return

    const handleTypingStatus = (data: { userId: string; nickname: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev)
        if (data.isTyping) {
          newMap.set(data.userId, data.nickname)
        } else {
          newMap.delete(data.userId)
        }
        return newMap
      })
    }

    socket.on("userTypingStatus", handleTypingStatus)
    return () => {
      socket.off("userTypingStatus", handleTypingStatus)
    }
  }, [socket])

  return {
    typingUsers: Array.from(typingUsers.values()),
    sendTypingStatus,
  }
}
