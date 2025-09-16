import type React from "react"
import { ImageIcon, Video, Music, FileText } from "lucide-react"
import type { Message } from "../types/encryption" // Assuming you move the Message type here

export const getFileIcon = (fileType: string): React.ReactNode => {
  if (fileType.startsWith("image/")) return <ImageIcon size={20} />
  if (fileType.startsWith("video/")) return <Video size={20} />
  if (fileType.startsWith("audio/")) return <Music size={20} />
  return <FileText size={20} />
}

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const formatMessageDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
  }
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export const groupMessagesByDate = (messages: Message[]) => {
  const groups: { date: string; messages: Message[] }[] = []
  if (!messages.length) return groups

  let currentDate = formatMessageDate(messages[0].timestamp)
  let currentGroup: Message[] = []

  messages.forEach((message) => {
    const messageDate = formatMessageDate(message.timestamp)
    if (messageDate !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, messages: currentGroup })
      }
      currentDate = messageDate
      currentGroup = [message]
    } else {
      currentGroup.push(message)
    }
  })

  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, messages: currentGroup })
  }

  return groups
}