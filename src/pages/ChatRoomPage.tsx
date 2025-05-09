"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useSocket, registerUser, createChatRoom, requestJoinRoom } from "../services/socket"
import { useNavigate, useLocation } from "react-router-dom"
import JoinRoomModal from "../components/JoinRoomModal"
import { ArrowLeft, Loader2, AlertTriangle, Ghost } from "lucide-react"
import ChatLayout from "../components/ChatLayout"

interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  isPrivate?: boolean
  isCreator?: boolean
  participants: Array<{ nickname: string; joinedAt: number }>
  pendingParticipants?: Array<{ id: string; nickname: string; requestedAt: number }>
}

const ChatRoomPage = () => {
  const { connected, publicKey } = useWallet()
  const [roomCreated, setRoomCreated] = useState(false)
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [isCreatingRoom, setIsCreatingRoom] = useState(true)
  const [joinRoomId, setJoinRoomId] = useState("")
  const [joinRoomToken, setJoinRoomToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nickname, setNickname] = useState("")
  const [isRegistered, setIsRegistered] = useState(false)
  const [isPendingApproval, setIsPendingApproval] = useState(false)
  const [pendingRoomInfo, setPendingRoomInfo] = useState<{ roomId: string; roomName: string } | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [mockNfts, setMockNfts] = useState<any[]>([])

  // Initialize socket connection
  const { socket, isConnected, connect } = useSocket()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  // Connect socket when component mounts
  useEffect(() => {
    connect()
  }, [])

  // Check for room data passed from HomePage
  useEffect(() => {
    if (location.state) {
      const { roomData, isPendingApproval: isPending, pendingRoomInfo: pendingInfo } = location.state as any

      if (roomData) {
        setRoomData(roomData)
        setRoomCreated(true)
      }

      if (isPending && pendingInfo) {
        setIsPendingApproval(true)
        setPendingRoomInfo(pendingInfo)
      }
    }
  }, [location.state])

  // Register user when wallet connects
  useEffect(() => {
    const registerUserWithWallet = async () => {
      if (connected && publicKey && !isRegistered) {
        setIsLoading(true)
        setError(null)

        try {
          // Generate a default nickname if none provided
          const defaultNickname = `Anonymous-${Math.floor(Math.random() * 10000)}`
          const userNickname = nickname || defaultNickname

          const result = await registerUser(publicKey.toString(), userNickname)

          if (result.success) {
            setIsRegistered(true)
            setNickname(result.nickname || userNickname)
          } else {
            setError(result.error || "Failed to register user")
          }
        } catch (err) {
          setError("Error registering user: " + (err as Error).message)
        } finally {
          setIsLoading(false)
        }
      }
    }

    registerUserWithWallet()
  }, [connected, publicKey, nickname, isRegistered])

  // Listen for socket events related to join requests
  useEffect(() => {
    if (!socket) return

    // Handle join request approval
    const handleJoinRequestApproved = (data: {
      roomId: string
      roomName: string
      accessToken: string
      participants: Array<{ nickname: string; joinedAt: number }>
    }) => {
      setIsPendingApproval(false)
      setPendingRoomInfo(null)
      setRoomData({
        roomId: data.roomId,
        roomName: data.roomName,
        accessToken: data.accessToken,
        participants: data.participants,
      })
      setRoomCreated(true)

      // Store the access token in local storage for persistence
      if (data.accessToken) {
        localStorage.setItem(`room_token_${data.roomId}`, data.accessToken)
      }
    }

    // Handle join request rejection
    const handleJoinRequestRejected = (data: { roomId: string; roomName: string }) => {
      setIsPendingApproval(false)
      setPendingRoomInfo(null)
      setError(`Your request to join "${data.roomName}" was rejected.`)
    }

    // Handle pending participants updates (for room creator)
    const handlePendingJoinRequest = (data: {
      roomId: string
      pendingParticipants: Array<{ id: string; nickname: string; requestedAt: number }>
    }) => {
      if (roomData && roomData.roomId === data.roomId) {
        setRoomData({
          ...roomData,
          pendingParticipants: data.pendingParticipants,
        })
      }
    }

    // Handle room creator change
    const handleRoomCreatorChanged = (data: {
      roomId: string
      isCreator: boolean
      pendingParticipants: Array<{ id: string; nickname: string; requestedAt: number }>
    }) => {
      if (roomData && roomData.roomId === data.roomId) {
        setRoomData({
          ...roomData,
          isCreator: data.isCreator,
          pendingParticipants: data.pendingParticipants,
        })
      }
    }

    socket.on("joinRequestApproved", handleJoinRequestApproved)
    socket.on("joinRequestRejected", handleJoinRequestRejected)
    socket.on("pendingJoinRequest", handlePendingJoinRequest)
    socket.on("roomCreatorChanged", handleRoomCreatorChanged)

    return () => {
      socket.off("joinRequestApproved", handleJoinRequestApproved)
      socket.off("joinRequestRejected", handleJoinRequestRejected)
      socket.off("pendingJoinRequest", handlePendingJoinRequest)
      socket.off("roomCreatorChanged", handleRoomCreatorChanged)
    }
  }, [socket, roomData])

  const handleCreateRoom = async (formData: { roomName: string; nickname: string; isPrivate: boolean }) => {
    if (!connected || !publicKey) {
      setError("Please connect your wallet first")
      return
    }

    if (!formData.nickname) {
      setError("Please enter a nickname")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Update nickname if changed
      if (formData.nickname !== nickname) {
        setNickname(formData.nickname)
        const registerResult = await registerUser(publicKey.toString(), formData.nickname)
        if (!registerResult.success) {
          setError(registerResult.error || "Failed to update nickname")
          setIsLoading(false)
          return
        }
        setIsRegistered(true)
      }

      // Create the room
      const result = await createChatRoom(formData.roomName, formData.isPrivate)

      if (result.success && result.roomData) {
        setRoomData(result.roomData)
        setRoomCreated(true)

        // Store the access token in local storage for persistence
        if (result.roomData.accessToken) {
          localStorage.setItem(`room_token_${result.roomData.roomId}`, result.roomData.accessToken)
        }
      } else {
        setError(result.error || "Failed to create room")
      }
    } catch (error) {
      console.error("Error creating room:", error)
      setError("Failed to create room. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async (roomId: string, accessToken?: string) => {
    if (!connected || !publicKey) {
      setError("Please connect your wallet first")
      return
    }

    if (!roomId) {
      setError("Please enter a room ID")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Try to get token from local storage if not provided
      const storedToken = localStorage.getItem(`room_token_${roomId}`)
      const tokenToUse = accessToken || joinRoomToken || storedToken || undefined

      // Request to join the room
      const result = await requestJoinRoom(roomId, tokenToUse)

      if (result.success) {
        if (result.status === "joined" && result.roomData) {
          // Joined immediately
          setRoomData(result.roomData)
          setRoomCreated(true)
          setIsPendingApproval(false)
          setPendingRoomInfo(null)

          // Store token if provided
          if (tokenToUse) {
            localStorage.setItem(`room_token_${roomId}`, tokenToUse)
          }
        } else if (result.status === "pending" && result.roomData) {
          // Join request is pending approval
          setIsPendingApproval(true)
          setPendingRoomInfo({
            roomId: result.roomData.roomId,
            roomName: result.roomData.roomName,
          })
        }
      } else {
        setError(result.error || "Failed to join room")
      }
    } catch (error) {
      console.error("Error joining room:", error)
      setError("Failed to join room. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleRoomAction = () => {
    setIsCreatingRoom(!isCreatingRoom)
    setError(null)
  }

  const cancelPendingRequest = () => {
    setIsPendingApproval(false)
    setPendingRoomInfo(null)
  }

  const handleNftGenerated = (nft: any) => {
    setMockNfts((prev) => [...prev, nft])
    console.log("NFT generated successfully:", nft)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="py-4 px-6 border-b border-[#333333]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="border border-[#333333] rounded-full px-6 py-2 flex items-center">
              <Ghost className="mr-2 text-[#FF4D00]" size={16} />
              <span className="text-sm font-medium tracking-wide">ANoGhost</span>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-white text-sm hover:text-[#FF4D00] transition-colors tracking-wide">
              Features
            </a>
            <a href="#" className="text-gray-400 text-sm hover:text-white transition-colors tracking-wide">
              Privacy
            </a>
            <a href="#" className="text-gray-400 text-sm hover:text-white transition-colors tracking-wide">
              Security
            </a>
            <a href="#" className="text-gray-400 text-sm hover:text-white transition-colors tracking-wide">
              Community
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <div className="border border-[#333333] rounded-full px-4 py-2 text-sm">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <button
              onClick={() => navigate("/")}
              className="border border-[#333333] rounded-full px-4 py-2 text-sm flex items-center hover:border-[#FF4D00] hover:text-[#FF4D00] transition-colors"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative">
        {/* Abstract background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[10%] left-[5%] w-[300px] h-[300px] border border-[#222222] rounded-full opacity-20"></div>
          <div className="absolute bottom-[15%] right-[8%] w-[250px] h-[250px] border border-[#222222] rounded-full opacity-15"></div>
          <div className="absolute top-[40%] right-[15%] w-[150px] h-[150px] border border-[#FF4D00] rounded-full opacity-10"></div>
          <div className="absolute top-[60%] left-[20%] w-[100px] h-[100px] bg-[#FF4D00] rounded-full opacity-5"></div>
          <div className="absolute top-[20%] right-[30%] w-[200px] h-[5px] bg-[#333333] rounded-full opacity-20 transform rotate-45"></div>
          <div className="absolute bottom-[30%] left-[25%] w-[150px] h-[3px] bg-[#FF4D00] rounded-full opacity-10 transform -rotate-45"></div>
        </div>
        <div className="w-full max-w-full z-10 relative">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-md text-[#FF4D00] text-sm flex items-start max-w-2xl mx-auto">
              <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Main Content Container */}
          <div className="rounded-md overflow-hidden">
            {roomCreated && roomData ? (
              <ChatLayout
                roomData={roomData}
                nickname={nickname}
                pendingParticipants={roomData.pendingParticipants || []}
                isCreator={roomData.isCreator || false}
                mockNfts={mockNfts}
                onNftGenerated={handleNftGenerated}
              />
            ) : isPendingApproval && pendingRoomInfo ? (
              <div className="p-8 md:p-12 text-center bg-black border border-[#222222] rounded-md">
                <div className="mb-8">
                  <div className="h-20 w-20 mx-auto rounded-full border border-[#FF4D00] flex items-center justify-center">
                    <Loader2 size={32} className="text-[#FF4D00] animate-spin" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-4">Waiting for Approval</h3>
                <p className="mb-6 text-gray-400 max-w-md mx-auto">
                  Your request to join <span className="text-white">{pendingRoomInfo.roomName}</span> is pending
                  approval from the room creator.
                </p>
                <button
                  onClick={cancelPendingRequest}
                  className="bg-[#111111] hover:bg-[#222222] text-white font-medium py-3 px-8 rounded-md transition-colors border border-[#333333]"
                >
                  Cancel Request
                </button>
              </div>
            ) : (
              <div className="bg-black border border-[#222222] rounded-md">
                {/* Page Title */}
                <div className="text-center p-6 pb-0">
                  <div className="flex items-center justify-center mb-4">
                    <div className="text-sm border border-[#222222] py-1 px-3 rounded-md">01</div>
                    <div className="ml-3 text-sm border border-[#222222] py-1 px-3 rounded-md">
                      {isCreatingRoom ? "Create Room" : "Join Room"}
                    </div>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    Next level of <span className="text-[#FF4D00]">crypto</span> chat
                  </h2>
                  <p className="text-gray-400 text-sm max-w-lg mx-auto">
                    {isCreatingRoom
                      ? "Create a new anonymous chat room with end-to-end encryption"
                      : "Join an existing chat room with your anonymous identity"}
                  </p>
                </div>

                <div className="p-6">
                  {/* Wallet Connection Section */}
                  {!connected && (
                    <div className="mb-8 text-center">
                      <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Connect your Solana wallet to create or join anonymous chat rooms.
                      </p>
                      <div className="flex justify-center">
                        <WalletMultiButton className="!bg-[#FF4D00] !text-black !font-medium !py-3 !px-8 !rounded-md !transition-all !border-none" />
                      </div>
                    </div>
                  )}

                  {connected && (
                    <div className="max-w-md mx-auto">
                      {isCreatingRoom ? (
                        <>
                          <div className="mb-8 text-center">
                            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                              Please click the button below to create a new chat room.
                            </p>
                            <button
                              onClick={() =>
                                handleCreateRoom({
                                  roomName: "New Chat Room",
                                  nickname: nickname || `Anonymous-${Math.floor(Math.random() * 10000)}`,
                                  isPrivate: false,
                                })
                              }
                              className="bg-[#FF4D00] text-black font-medium py-3 px-8 rounded-md transition-colors"
                            >
                              Create New Chat Room
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center space-y-6 py-4">
                          <div className="border border-[#222222] p-5 rounded-md w-full">
                            <h3 className="text-lg font-medium mb-4 text-center">Join a Chat Room</h3>
                            <p className="text-center text-gray-400 mb-6">
                              Enter a room ID to join an existing chat room
                            </p>
                            <button
                              onClick={() => setIsJoinModalOpen(true)}
                              className="w-full bg-[#FF4D00] text-black font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center"
                            >
                              Join Existing Room
                            </button>
                          </div>
                          <button
                            onClick={toggleRoomAction}
                            className="text-[#FF4D00] hover:text-[#FF6B33] py-2 transition-colors flex items-center"
                          >
                            Want to create a room instead?
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats Section */}
                <div className="border-t border-[#222222] p-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">93m+</p>
                      <p className="text-xs text-gray-500">Total locked</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">3.2b</p>
                      <p className="text-xs text-gray-500">Market size</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">1k+</p>
                      <p className="text-xs text-gray-500">Active rooms</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">221k</p>
                      <p className="text-xs text-gray-500">Transactions</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinSuccess={(roomData) => {
          setRoomData(roomData)
          setRoomCreated(true)
        }}
        onJoinPending={(roomInfo) => {
          setIsPendingApproval(true)
          setPendingRoomInfo(roomInfo)
        }}
      />
    </div>
  )
}

export default ChatRoomPage
