"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useSocket, createChatRoom, requestJoinRoom } from "../services/socket"
import { useNavigate } from "react-router-dom"
import { mintNftAccessPasses } from "../api/apiNft"
import { useGhostNest } from "./GhostNestContext"
import { useGhostId } from "./GhostIdContext"

// Define the types for your state and functions
interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  isPrivate?: boolean
  isCreator?: boolean
  participants: Array<{ nickname: string; joinedAt: number }>
  pendingParticipants?: Array<{ id: string; nickname: string; requestedAt: number }>
  nickname?: string
}

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
  participants: Array<{ nickname: string; joinedAt: number }>
  setIsCreatingRoom: (isCreating: boolean) => void
  handleCreateRoom: (formData: {
    roomName: string
    nickname: string
    isPrivate: boolean
    ghostIds: string[]
  }) => Promise<void>
  handleJoinRoom: (roomId: string, nickname: string, accessToken?: string) => Promise<void>
  handleJoinPending: (roomId: string, nickname: string, roomName?: string) => void
  cancelPendingRequest: () => void
  goBack: () => void
  handleNftGenerated: (nft: any) => void
  toggleRoomAction: () => void
}

// Create the context
const ChatRoomContext = createContext<ChatRoomContextType | undefined>(undefined)

// Provider component
export const ChatRoomProvider = ({ children, locationState }: { children: ReactNode; locationState: any }) => {
  const { connected, publicKey } = useWallet()
  const { API_URL } = useGhostNest()
  const { socket, connect } = useSocket()
  const navigate = useNavigate()
  const { isRegistered, ghostId } = useGhostId()

  const [roomCreated, setRoomCreated] = useState(false)
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [isCreatingRoom, setIsCreatingRoom] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nickname, setNickname] = useState("")
  const [isPendingApproval, setIsPendingApproval] = useState(false)
  const [pendingRoomInfo, setPendingRoomInfo] = useState<{
    roomId: string
    roomName?: string
    nickname: string
  } | null>(null)

  const [mintingStatus, setMintingStatus] = useState<string>("")
  const [mockNfts, setMockNfts] = useState<any[]>([])

  useEffect(() => {
    connect()
  }, [connect])

  const handleJoinPending = useCallback((roomId: string, nickname: string, roomName?: string) => {
    console.log("⚠️ [handleJoinPending] Pending join request:", { roomId, nickname, roomName })
    setIsPendingApproval(true)
    setPendingRoomInfo({ roomId, roomName, nickname })
    localStorage.setItem("pendingRequest", JSON.stringify({ roomId, roomName, nickname }))
    setNickname(nickname)
  }, [])

  const handleJoinRoom = useCallback(
    async (roomId: string, newNickname: string, accessToken?: string) => {
      console.log("[handleJoinRoom] nickname before request:", newNickname)
      if (!connected || !publicKey) {
        setError("Please connect your wallet first")
        setIsLoading(false)
        return
      }
      if (!roomId) {
        setError("Please enter a room ID")
        setIsLoading(false)
        return
      }
      if (!isRegistered) {
        setError("User is not registered. Please wait for your anonymous ID.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const storedToken = localStorage.getItem(`room_token_${roomId}`)
        const tokenToUse = accessToken || storedToken || undefined
        const result = await requestJoinRoom(roomId, newNickname, tokenToUse, ghostId)

        console.log("✅ [handleJoinRoom] requestJoinRoom result:", result)

        if (result.success) {
          if (result.status === "joined" && result.roomData) {
            setRoomData(result.roomData)
            setRoomCreated(true)
            setNickname(newNickname)
            console.log("👍 [handleJoinRoom] Join successful, setting nickname to:", newNickname)
            setIsPendingApproval(false)
            setPendingRoomInfo(null)
            if (tokenToUse) localStorage.setItem(`room_token_${roomId}`, tokenToUse)
            localStorage.setItem(`room_data_${roomId}`, JSON.stringify({ ...result.roomData, nickname: newNickname }))
          } else if (result.status === "pending" && result.roomData) {
            setIsPendingApproval(true)
            setPendingRoomInfo({
              roomId: result.roomData.roomId,
              roomName: result.roomData.roomName,
              nickname: newNickname,
            })

            console.log("⏳ [handleJoinRoom] pending approval - saving to localStorage nickname:", newNickname)

            localStorage.setItem(
              "pending_room_info",
              JSON.stringify({
                roomId: result.roomData.roomId,
                roomName: result.roomData.roomName,
                nickname: newNickname,
              }),
            )
            localStorage.setItem("is_pending_approval", "true")
          }
        } else {
          setError(result.error || "Failed to join room")
        }
      } catch (err) {
        console.error("❌ [handleJoinRoom] Failed to join room:", err)
        setError("Failed to join room. Please try again.")
      } finally {
        setIsLoading(false)
      }
    },
    [connected, publicKey, isRegistered, ghostId],
  )

  const handleCreateRoom = useCallback(
    async (formData: { roomName: string; nickname: string; isPrivate: boolean; ghostIds: string[] }) => {
      console.log("[handleCreateRoom] called with nickname:", formData.nickname)
      if (!connected || !publicKey) {
        setError("Please connect your wallet first")
        return
      }
      if (!isRegistered) {
        setError("User is not registered. Please wait for your anonymous ID.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setMintingStatus("Creating encrypted chat room...")

      try {
        const result = await createChatRoom(formData.roomName, formData.nickname, formData.isPrivate)

        console.log("✅ [handleCreateRoom] createChatRoom result:", result)

        if (result.success && result.roomData) {
          if (result.roomData.accessToken)
            localStorage.setItem(`room_token_${result.roomData.roomId}`, result.roomData.accessToken)

          if (formData.ghostIds && formData.ghostIds.length > 0) {
            setMintingStatus(`Minting ${formData.ghostIds.length} NFT access passes...`)
            try {
              const mintedNfts = await mintNftAccessPasses(
                API_URL,
                result.roomData.roomId,
                formData.roomName,
                formData.ghostIds,
              )
              setMockNfts(mintedNfts)
              setMintingStatus("NFT access passes created successfully!")
            } catch (mintError) {
              console.error("❌ [handleCreateRoom] Minting failed:", mintError)
              setError("Room created, but failed to mint NFT access passes.")
            }
          }
          setRoomData(result.roomData)
          setRoomCreated(true)
          setNickname(formData.nickname)
          console.log("👍 [handleCreateRoom] Creation successful, setting nickname to:", formData.nickname)
          localStorage.setItem(
            `room_data_${result.roomData.roomId}`,
            JSON.stringify({ ...result.roomData, nickname: formData.nickname }),
          )
        } else {
          setError(result.error || "Failed to create room")
        }
      } catch (err) {
        console.error("❌ [handleCreateRoom] Failed to create room:", err)
        setError("Failed to create room. Please try again.")
      } finally {
        setIsLoading(false)
        setMintingStatus("")
      }
    },
    [connected, publicKey, isRegistered, API_URL],
  )

  useEffect(() => {
    if (locationState) {
      console.log("🔄 [useEffect locationState] locationState is present:", locationState)
      const { roomData: navRoomData, isPendingApproval: isPending, pendingRoomInfo: pendingInfo } = locationState as any
      if (navRoomData) {
        console.log(
          "🔎 [useEffect locationState] Found navRoomData. Setting nickname to:",
          navRoomData.nickname ?? "N/A",
        )
        setRoomData(navRoomData)
        setRoomCreated(true)
        setNickname(navRoomData.nickname ?? "")
        localStorage.setItem(`room_data_${navRoomData.roomId}`, JSON.stringify(navRoomData))
      }
      if (isPending && pendingInfo) {
        console.log(
          "⏳ [useEffect locationState] pending approval detected, nickname from locationState:",
          pendingInfo.nickname ?? "N/A",
        )
        setIsPendingApproval(true)
        setPendingRoomInfo(pendingInfo)
        setNickname(pendingInfo.nickname ?? "")
        localStorage.setItem("pending_room_info", JSON.stringify(pendingInfo))
        localStorage.setItem("is_pending_approval", "true")
      }
    }
  }, [locationState])

  useEffect(() => {
    const isPendingStr = localStorage.getItem("is_pending_approval")
    const pendingInfoStr = localStorage.getItem("pending_room_info")
    if (isPendingStr === "true" && pendingInfoStr) {
      try {
        const pendingInfo = JSON.parse(pendingInfoStr)
        console.log("🔎 [useEffect localStorage] Found pending_room_info, nickname:", pendingInfo.nickname ?? "N/A")
        setIsPendingApproval(true)
        setPendingRoomInfo(pendingInfo)
        setNickname(pendingInfo.nickname ?? "")
      } catch (e) {
        console.error("❌ [useEffect localStorage] Error parsing pending room info:", e)
      }
    } else if (isRegistered && !roomCreated) {
      const storedRoomIds = Object.keys(localStorage)
        .filter((key) => key.startsWith("room_token_"))
        .map((key) => key.replace("room_token_", ""))
      if (storedRoomIds.length > 0) {
        for (const roomId of storedRoomIds) {
          const storedRoomDataStr = localStorage.getItem(`room_data_${roomId}`)
          if (storedRoomDataStr) {
            try {
              const parsedRoomData = JSON.parse(storedRoomDataStr)
              const accessToken = localStorage.getItem(`room_token_${roomId}`)
              if (accessToken && parsedRoomData.nickname) {
                console.log(
                  "🔄 [useEffect localStorage] Found stored room data. Rejoining with nickname:",
                  parsedRoomData.nickname,
                )
                handleJoinRoom(roomId, parsedRoomData.nickname, accessToken)
                return
              }
            } catch (e) {
              console.error("❌ [useEffect localStorage] Error parsing stored room data for rejoin:", e)
            }
          }
        }
      }
    }
  }, [isRegistered, roomCreated, handleJoinRoom])

  useEffect(() => {
    if (!socket) return

    const handleJoinRequestApproved = (data: any) => {
      console.log("✅ [joinRequestApproved] received event, raw data:", data)
      console.log("[v0] Current roomData participants before update:", roomData?.participants?.length || 0)
      console.log("[v0] New participants from server:", data.participants?.length || 0)

      const newRoomData = {
        ...data,
        isCreator: data.isCreator !== undefined ? data.isCreator : roomData?.isCreator || false,
        participants: [...(data.participants || [])], // Spread the participants array
      }

      console.log("[v0] Setting new roomData with participants:", newRoomData.participants?.length || 0)
      setRoomData(newRoomData)
      setRoomCreated(true)

      const pendingInfoStr = localStorage.getItem("pending_room_info")
      let userNickname = ""
      if (pendingInfoStr) {
        try {
          const pendingInfo = JSON.parse(pendingInfoStr)
          userNickname = pendingInfo.nickname
          console.log("[joinRequestApproved] nickname retrieved from pending_room_info:", userNickname)
        } catch (e) {
          console.error("[joinRequestApproved] Error parsing pending room info:", e)
        }
      } else {
        console.warn("[joinRequestApproved] No pending_room_info found. Fallback to new room data.")
        userNickname = data.nickname || ""
      }

      setNickname(userNickname)
      localStorage.setItem(`room_token_${data.roomId}`, data.accessToken)
      localStorage.setItem(`room_data_${data.roomId}`, JSON.stringify({ ...newRoomData, nickname: userNickname }))
      localStorage.removeItem("pending_room_info")
      localStorage.removeItem("is_pending_approval")
    }

    const handleJoinRequestRejected = (data: any) => {
      console.log("❌ [joinRequestRejected] received event", data)
      setIsPendingApproval(false)
      setPendingRoomInfo(null)
      setError(`Your request to join "${data.roomName}" was rejected.`)
      localStorage.removeItem("pending_room_info")
      localStorage.removeItem("is_pending_approval")
    }

    const handlePendingJoinRequest = (data: any) => {
      console.log("⏳ [pendingJoinRequest] received event", data)
      setRoomData((prev) =>
        prev && prev.roomId === data.roomId ? { ...prev, pendingParticipants: data.pendingParticipants } : prev,
      )
    }

    const handleRoomCreatorChanged = (data: any) => {
      console.log("🔄 [roomCreatorChanged] received event", data)
      setRoomData((prev) =>
        prev && prev.roomId === data.roomId
          ? { ...prev, isCreator: data.isCreator, pendingParticipants: data.pendingParticipants }
          : prev,
      )
    }

    const onUserJoined = (data: any) => {
      console.log("➡️ [userJoinedRoom] received event", data)
      console.log("[v0] onUserJoined - Current participants:", roomData?.participants?.length || 0)
      console.log("[v0] onUserJoined - New participants from server:", data.participants?.length || 0)
      setRoomData((prevRoomData) => {
        const isMatchingRoom =
          (prevRoomData && prevRoomData.roomId === data.roomId) ||
          (pendingRoomInfo && pendingRoomInfo.roomId === data.roomId)

        if (isMatchingRoom) {
          console.log(
            `➡️ [userJoinedRoom] Updating participants from ${prevRoomData?.participants?.length || 0} to ${data.participants.length}`,
          )
          console.log("[v0] onUserJoined - Actually updating participants list")
          const baseRoomData = prevRoomData || {
            roomId: data.roomId,
            roomName: pendingRoomInfo?.roomName || "",
            participants: [],
            isCreator: false,
          }
          // Always return a new object to trigger a re-render
          return { ...baseRoomData, participants: [...data.participants] }
        }
        console.log("[v0] onUserJoined - No room data match, not updating")
        console.log("[v0] onUserJoined - prevRoomData roomId:", prevRoomData?.roomId)
        console.log("[v0] onUserJoined - event roomId:", data.roomId)
        console.log("[v0] onUserJoined - pendingRoomInfo roomId:", pendingRoomInfo?.roomId)
        return prevRoomData
      })
    }

    const onUserLeft = (data: any) => {
      console.log("⬅️ [userLeftRoom] received event", data)
      setRoomData((prevRoomData) => {
        if (prevRoomData && prevRoomData.roomId === data.roomId) {
          console.log(
            `⬅️ [userLeftRoom] Updating participants from ${prevRoomData.participants.length} to ${data.participants.length}`,
          )
          // Always return a new object to trigger a re-render
          return { ...prevRoomData, participants: [...data.participants] }
        }
        return prevRoomData
      })
    }

    socket.on("userJoinedRoom", onUserJoined)
    socket.on("userLeftRoom", onUserLeft)
    socket.on("joinRequestApproved", handleJoinRequestApproved)
    socket.on("joinRequestRejected", handleJoinRequestRejected)
    socket.on("pendingJoinRequest", handlePendingJoinRequest)
    socket.on("roomCreatorChanged", handleRoomCreatorChanged)

    return () => {
      socket.off("userJoinedRoom", onUserJoined)
      socket.off("userLeftRoom", onUserLeft)
      socket.off("joinRequestApproved", handleJoinRequestApproved)
      socket.off("joinRequestRejected", handleJoinRequestRejected)
      socket.off("pendingJoinRequest", handlePendingJoinRequest)
      socket.off("roomCreatorChanged", handleRoomCreatorChanged)
    }
  }, [socket, roomData])

  // Helper functions
  const cancelPendingRequest = () => {
    setIsPendingApproval(false)
    setPendingRoomInfo(null)
    localStorage.removeItem("is_pending_approval")
    localStorage.removeItem("pending_room_info")
  }

  const goBack = () => navigate("/")
  const handleNftGenerated = (nft: any) => setMockNfts((prev) => [...prev, nft])
  const toggleRoomAction = () => {
    setIsCreatingRoom(!isCreatingRoom)
    setError(null)
  }

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
    participants: roomData?.participants || [],
    setIsCreatingRoom,
    handleCreateRoom,
    handleJoinRoom,
    handleJoinPending,
    cancelPendingRequest,
    goBack,
    handleNftGenerated,
    toggleRoomAction,
  }

  return <ChatRoomContext.Provider value={value}>{children}</ChatRoomContext.Provider>
}

// Custom hook to use the context
export const useChatRoom = () => {
  const context = useContext(ChatRoomContext)
  if (context === undefined) {
    throw new Error("useChatRoom must be used within a ChatRoomProvider")
  }
  return context
}
