// src/contexts/ChatRoomContext.tsx
"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useRoomLifecycle, type RoomData } from "../hooks/rooms/useRoomLifecycle"

// Define the types for your state and functions
type ChatRoomContextType = {
  roomCreated: boolean
  roomData: RoomData | null
  isCreatingRoom: boolean
  isLoading: boolean
  error: string | null
  nickname: string
  isRegistered: boolean
  isPendingApproval: boolean
  pendingRoomInfo: { roomId: string; roomName?: string; nickname: string } | null
  mintingStatus: string
  mockNfts: any[]
  usersRooms: any[]
  participants: Array<{ nickname: string; joinedAt: number }>
  setIsCreatingRoom: (isCreating: boolean) => void
  handleCreateRoom: (formData: {
    roomName: string
    nickname: string
    isPrivate: boolean
    ghostIds: string[]
  }) => Promise<RoomData | null>
  handleLeaveRoom: (roomId: string) => Promise<void>
  handleJoinRoom: (roomId: string, nickname: string, accessToken?: string) => Promise<void>
  handleJoinPending: (roomId: string, nickname: string, roomName?: string) => void
  cancelPendingRequest: () => void
  goBack: () => void
  handleSelectRoom: (roomId: string) => void
  handleNftGenerated: (nft: any) => void
  toggleRoomAction: () => void
}

// Create the context
const ChatRoomContext = createContext<ChatRoomContextType | undefined>(undefined)

// Provider component
export const ChatRoomProvider = ({ children, locationState }: { children: ReactNode; locationState: any }) => {
  const {
    roomCreated,
    roomData,
    isCreatingRoom,
    isLoading,
    error,
    nickname,
    isRegistered,
    isPendingApproval,
    pendingRoomInfo,
    mintingStatus,
    mockNfts,
    usersRooms,
    participants,
    setIsCreatingRoom,
    handleCreateRoom,
    handleLeaveRoom,
    handleSelectRoom,
    handleJoinRoom,
    handleJoinPending,
    cancelPendingRequest,
    goBack,
    handleNftGenerated,
    toggleRoomAction,
  } = useRoomLifecycle(locationState)

  const value = {
    roomCreated,
    roomData,
    isCreatingRoom,
    isLoading,
    error,
    nickname,
    isRegistered,
    isPendingApproval,
    pendingRoomInfo,
    mintingStatus,
    mockNfts,
    usersRooms,
    participants,
    setIsCreatingRoom,
    handleCreateRoom,
    handleLeaveRoom,
    handleSelectRoom,
    handleJoinRoom,
    handleJoinPending,
    cancelPendingRequest,
    goBack,
    handleNftGenerated,
    toggleRoomAction,
  }

  return <ChatRoomContext.Provider value={value}>{children}</ChatRoomContext.Provider>
}

export const useChatRoom = () => {
  const context = useContext(ChatRoomContext)
  if (context === undefined) {
    throw new Error("useChatRoom must be used within a ChatRoomProvider")
  }
  return context
}
