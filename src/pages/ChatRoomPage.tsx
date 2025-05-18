"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useSocket, registerUser, createChatRoom, requestJoinRoom } from "../services/socket"
import { useNavigate, useLocation } from "react-router-dom"
import JoinRoomModal from "../components/JoinRoomModal"
import ChatRoomForm from "../components/ChatRoomForm"
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react"
import ChatLayout from "../components/ChatLayout"

// Mock function to simulate NFT minting - replace with actual implementation
const mintNftAccessPasses = async (roomId: string, ghostIds: string[]): Promise<any[]> => {
  console.log(`Minting NFT access passes for room ${roomId} to ${ghostIds.length} GhostIDs`)

  // Simulate minting delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Return mock NFT data
  return ghostIds.map((id, index) => ({
    mint: `NFT${index}-${Date.now()}`,
    recipient: id,
    roomId,
    createdAt: Date.now(),
  }))
}

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

  // NFT minting status
  const [mintingStatus, setMintingStatus] = useState<string>("")

  // Initialize socket connection
  const { socket, isConnected, connect } = useSocket()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  // Connect socket when component mounts
  useEffect(() => {
    connect()
  }, [])

  // Check for room data passed from HomePage
  useEffect(() => {
    // First check location state (from direct navigation)
    if (location.state) {
      const { roomData, isPendingApproval: isPending, pendingRoomInfo: pendingInfo } = location.state as any

      if (roomData) {
        setRoomData(roomData)
        setRoomCreated(true)

        // Store room data in localStorage for persistence
        localStorage.setItem(`room_data_${roomData.roomId}`, JSON.stringify(roomData))
      }

      if (isPending && pendingInfo) {
        setIsPendingApproval(true)
        setPendingRoomInfo(pendingInfo)

        // Store pending info in localStorage
        localStorage.setItem("pending_room_info", JSON.stringify(pendingInfo))
        localStorage.setItem("is_pending_approval", "true")
      }
    }
  }, [location.state])

  // Add this after the useEffect that handles location.state
  useEffect(() => {
    // Only try to restore room data if the user is registered but no room is active
    if (isRegistered && !roomCreated && !isPendingApproval) {
      // Check localStorage for room data
      const storedRoomIds = Object.keys(localStorage)
        .filter((key) => key.startsWith("room_token_"))
        .map((key) => key.replace("room_token_", ""))

      // Check if we have stored room data
      for (const roomId of storedRoomIds) {
        const storedRoomData = localStorage.getItem(`room_data_${roomId}`)
        if (storedRoomData) {
          try {
            const parsedRoomData = JSON.parse(storedRoomData)
            console.log("Attempting to rejoin stored room:", parsedRoomData.roomName)

            // Try to rejoin this room
            const accessToken = localStorage.getItem(`room_token_${roomId}`)
            if (accessToken) {
              handleJoinRoom(roomId, accessToken)
              return // Exit after attempting to join the first found room
            }
          } catch (e) {
            console.error("Error parsing stored room data:", e)
          }
        }
      }

      // Check for pending room info
      const isPendingStr = localStorage.getItem("is_pending_approval")
      const pendingInfoStr = localStorage.getItem("pending_room_info")

      if (isPendingStr === "true" && pendingInfoStr) {
        try {
          const pendingInfo = JSON.parse(pendingInfoStr)
          setIsPendingApproval(true)
          setPendingRoomInfo(pendingInfo)
        } catch (e) {
          console.error("Error parsing pending room info:", e)
        }
      }
    }
  }, [isRegistered, roomCreated, isPendingApproval])

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

  const handleCreateRoom = async (formData: {
    roomName: string
    nickname: string
    isPrivate: boolean
    ghostIds: string[]
  }) => {
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
      setMintingStatus("Registering user...")

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
      setMintingStatus("Creating encrypted chat room...")
      const result = await createChatRoom(formData.roomName, formData.isPrivate)

      if (result.success && result.roomData) {
        // Store the access token in local storage for persistence
        if (result.roomData.accessToken) {
          localStorage.setItem(`room_token_${result.roomData.roomId}`, result.roomData.accessToken)
        }

        // If we have GhostIDs, mint NFTs before completing
        if (formData.ghostIds && formData.ghostIds.length > 0) {
          setMintingStatus(`Minting ${formData.ghostIds.length} NFT access passes...`)

          try {
            // Mint NFT access passes
            const mintedNfts = await mintNftAccessPasses(result.roomData.roomId, formData.ghostIds)
            setMockNfts(mintedNfts)

            setMintingStatus("NFT access passes created successfully!")
          } catch (mintError) {
            console.error("Error minting NFTs:", mintError)
            setError("Room created but failed to mint NFT access passes. You can try again later.")
            // Continue to room even if NFT minting fails
          }
        }

        // Finally set room data and mark as created
        setRoomData(result.roomData)
        setRoomCreated(true)

        // Store room data in localStorage for persistence
        localStorage.setItem(`room_data_${result.roomData.roomId}`, JSON.stringify(result.roomData))
      } else {
        setError(result.error || "Failed to create room")
      }
    } catch (error) {
      console.error("Error creating room:", error)
      setError("Failed to create room. Please try again.")
    } finally {
      setIsLoading(false)
      setMintingStatus("")
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

          // Store room data in localStorage
          localStorage.setItem(`room_data_${roomId}`, JSON.stringify(result.roomData))

          // Clear any pending status
          localStorage.removeItem("is_pending_approval")
          localStorage.removeItem("pending_room_info")
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

  const goBack = () => {
    navigate("/")
  }

  // Render loading state during room creation and NFT minting
  const renderLoadingState = () => (
    <div className="p-6 text-center bg-black border border-[#222222] rounded-md">
      <div className="mb-6">
        <div className="h-16 w-16 mx-auto rounded-full border border-[#FF4D00] flex items-center justify-center">
          <Loader2 size={24} className="text-[#FF4D00] animate-spin" />
        </div>
      </div>
      <h3 className="text-lg font-medium mb-3">Creating Your Chat Room</h3>
      <p className="mb-2 text-gray-400 max-w-md mx-auto">{mintingStatus || "Processing your request..."}</p>
      <div className="w-full max-w-xs mx-auto bg-[#111111] rounded-full h-1.5 mt-3 mb-4">
        <div className="bg-[#FF4D00] h-1.5 rounded-full animate-pulse"></div>
      </div>
      <p className="text-xs text-gray-500">This may take a moment. Please don't close this window.</p>
    </div>
  )

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center">
      {roomCreated && roomData ? (
        <ChatLayout
          roomData={roomData}
          nickname={nickname}
          pendingParticipants={roomData.pendingParticipants || []}
          isCreator={roomData.isCreator || false}
          mockNfts={mockNfts}
          onNftGenerated={handleNftGenerated}
        />
      ) : (
        <div className="w-full max-w-md h-auto max-h-screen">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-md text-[#FF4D00] text-sm flex items-start">
              <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {isPendingApproval && pendingRoomInfo ? (
            <div className="p-6 text-center bg-black border border-[#222222] rounded-md relative">
              <button
                onClick={goBack}
                className="absolute top-3 left-3 p-2 text-gray-400 hover:text-[#FF4D00] transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="mb-6 mt-6">
                <div className="h-16 w-16 mx-auto rounded-full border border-[#FF4D00] flex items-center justify-center">
                  <Loader2 size={24} className="text-[#FF4D00] animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-3">Waiting for Approval</h3>
              <p className="mb-4 text-gray-400 max-w-md mx-auto">
                Your request to join <span className="text-white">{pendingRoomInfo.roomName}</span> is pending approval
                from the room creator.
              </p>
              <button
                onClick={cancelPendingRequest}
                className="bg-[#111111] hover:bg-[#222222] text-white font-medium py-2 px-6 rounded-md transition-colors border border-[#333333]"
              >
                Cancel Request
              </button>
            </div>
          ) : isLoading && mintingStatus ? (
            <div className="relative">
              <button
                onClick={goBack}
                className="absolute top-3 left-3 p-2 text-gray-400 hover:text-[#FF4D00] transition-colors z-10"
              >
                <ArrowLeft size={18} />
              </button>
              {renderLoadingState()}
            </div>
          ) : (
            <div className="bg-black border border-[#222222] rounded-md relative">
              <button
                onClick={goBack}
                className="absolute top-3 left-3 p-2 text-gray-400 hover:text-[#FF4D00] transition-colors z-10"
              >
                <ArrowLeft size={18} />
              </button>

              {/* Page Title */}
              <div className="text-center p-4 pt-10 pb-2">
                <h2 className="text-xl font-bold mb-1">
                  Next level of <span className="text-[#FF4D00]">crypto</span> chat
                </h2>
                <p className="text-gray-400 text-xs max-w-lg mx-auto">
                  {isCreatingRoom
                    ? "Create a new anonymous chat room with end-to-end encryption"
                    : "Join an existing chat room with your anonymous identity"}
                </p>
              </div>

              <div className="p-4">
                {/* Wallet Connection Section */}
                {!connected && (
                  <div className="mb-4 text-center">
                    <p className="text-gray-400 mb-4 text-sm max-w-md mx-auto">
                      Connect your Solana wallet to create or join anonymous chat rooms.
                    </p>
                    <div className="flex justify-center">
                      <WalletMultiButton className="!bg-[#FF4D00] !text-black !font-medium !py-2 !px-6 !rounded-md !transition-all !border-none !text-sm" />
                    </div>
                  </div>
                )}

                {connected && (
                  <div>
                    {isCreatingRoom ? (
                      <ChatRoomForm
                        onSubmit={handleCreateRoom}
                        buttonText="Create Room & Mint NFTs"
                        toggleText="Want to join a room instead?"
                        onToggle={toggleRoomAction}
                        isLoading={isLoading}
                        initialNickname={nickname}
                        showPrivateOption={true}
                      />
                    ) : (
                      <div className="flex flex-col items-center space-y-4 py-2">
                        <div className="border border-[#222222] p-4 rounded-md w-full">
                          <h3 className="text-base font-medium mb-3 text-center">Join a Chat Room</h3>
                          <p className="text-center text-gray-400 mb-4 text-sm">
                            Enter a room ID to join an existing chat room
                          </p>
                          <button
                            onClick={() => setIsJoinModalOpen(true)}
                            className="w-full bg-[#FF4D00] text-black font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
                          >
                            Join Existing Room
                          </button>
                        </div>
                        <button
                          onClick={toggleRoomAction}
                          className="text-[#FF4D00] hover:text-[#FF6B33] py-1 transition-colors flex items-center text-sm"
                        >
                          Want to create a room instead?
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
