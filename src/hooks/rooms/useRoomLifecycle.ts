"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useNavigate } from "react-router-dom"
import { createChatRoom, requestJoinRoom, leaveRoom, checkActiveRooms } from "../../services/socket"
import { useRoomStorage } from "./useRoomStorage"
import { useRoomNfts } from "./useRoomNfts"
import { useRoomPending } from "./useRoomPending"
import { useRoomUI } from "./useRoomUI"
import { useRoomSocket } from "./useRoomSocket"
import { useRoomInitialization } from "./useRoomInitialization"
import { useGhostNest } from "@/contexts/GhostNestContext"
import { useGhostId } from "@/contexts/GhostIdContext"

export interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  isPrivate?: boolean
  isCreator?: boolean
  participants: Array<{ nickname: string; joinedAt: number }>
  pendingParticipants?: Array<{ id: string; nickname: string; requestedAt: number }>
  nickname?: string
}

export const useRoomLifecycle = (locationState: any) => {
  const { connected, publicKey } = useWallet()
  const { API_URL } = useGhostNest()
  const { isRegistered, ghostId } = useGhostId()
  const navigate = useNavigate()

  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const roomDataRef = useRef(roomData); // Create a ref to hold the latest roomData

  // Effect to keep the ref in sync with the state
  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  const [roomCreated, setRoomCreated] = useState(false)
  const [nickname, setNickname] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [usersRooms, setUsersRooms] = useState<any[]>([])
  const {
    isPendingApproval,
    pendingRoomInfo,
    handleJoinPending,
    cancelPendingRequest,
    setIsPendingApproval,
    setPendingRoomInfo,
  } = useRoomPending()
  const { mintingStatus, mockNfts, mintNftAccessPasses, handleNftGenerated } = useRoomNfts(API_URL)
  const { isCreatingRoom, setIsCreatingRoom, error, setError, toggleRoomAction, goBack } = useRoomUI()
  const { saveRoomData, clearRoomData, saveRoomToken, loadRoomToken, loadRoomData, loadLastRoomId,  saveLastRoomId, clearLastRoomId } = useRoomStorage()

  // This is the actual implementation of the logic, recreated when state changes.
  const handleCreateRoomLogic = useCallback(
    async (formData: {
      roomName: string
      nickname: string
      isPrivate: boolean
      ghostIds: string[]
    }): Promise<RoomData | null> => {
      if (!connected || !publicKey) {
        setError("Please connect your wallet first");
        return null;
      }
      if (!isRegistered) {
        setError("User is not registered. Please wait for your anonymous ID.");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Read the most current roomData from the ref
        const currentRoomData = roomDataRef.current;
        const lastJoinedRoomId =  loadLastRoomId()
        console.log("Current room data")
        console.log(currentRoomData)
        console.log(roomData)
        if (currentRoomData && currentRoomData.roomId) {
          console.log("Leaving existing room:", currentRoomData.roomId);
          await leaveRoom(currentRoomData.roomId);
        } else if (lastJoinedRoomId) {
            console.log("Leaving existing room:", lastJoinedRoomId);
            await leaveRoom(lastJoinedRoomId);
        } else { 
           console.log("No existing room data found. Creating a new one.");
        }

        const result = await createChatRoom(formData.roomName, formData.nickname, formData.isPrivate);
        if (result.success && result.roomData) {
          if (result.roomData.accessToken) {
            saveRoomToken(result.roomData.roomId, result.roomData.accessToken);
          }
          await mintNftAccessPasses(result.roomData.roomId, formData.roomName, formData.ghostIds);

          const newRoomData = { ...result.roomData, nickname: formData.nickname };
          setRoomData(newRoomData);
          console.log("I did set new room data")
          console.log(newRoomData)
          saveLastRoomId(newRoomData.roomId)
          setRoomCreated(true);
          setNickname(formData.nickname);
          saveRoomData(result.roomData.roomId, newRoomData);
          
          return newRoomData;
        } else {
          setError(result.error || "Failed to create room");
          return null;
        }
      } catch (err) {
        console.error("❌ Failed to create room:", err);
        setError("Failed to create room. Please try again.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [  
      // We remove roomData from the dependency array as we now read it from a ref
      connected, publicKey, isRegistered, setError, setIsLoading, 
      saveRoomToken, mintNftAccessPasses, setRoomData, setRoomCreated, 
      setNickname, saveRoomData, clearRoomData, usersRooms, setUsersRooms
    ]
  );
  
  // We store the latest version of the logic function in a ref.
  const stableCreateRoomRef = useRef(handleCreateRoomLogic);
  useEffect(() => {
    stableCreateRoomRef.current = handleCreateRoomLogic;
  }, [handleCreateRoomLogic]);
  
  // This is the STABLE function that we'll pass to the UI.
  // It acts as a proxy, always calling the LATEST logic from the ref.
  const handleCreateRoom = useCallback(
    async (formData: any): Promise<RoomData | null> => {
      return stableCreateRoomRef.current(formData);
    },
    [] // Empty array ensures this function's identity never changes.
  );

  const fetchActiveRooms = useCallback(async () => {
    const storedRoomIds = Object.keys(localStorage)
      .filter((key) => key.startsWith("room_data_"))
      .map((key) => key.replace("room_data_", ""))

    if (storedRoomIds.length > 0) {
      try {
        const response = await checkActiveRooms(storedRoomIds)
        setUsersRooms(response.activeRooms || [])
      } catch (error) {
        console.error("💥 fetchActiveRooms: Exception occurred:", error)
        setUsersRooms([])
      }
    } else {
      setUsersRooms([])
    }
  }, []);
  
  const handleJoinRoom = useCallback(async (roomId: string, newNickname: string, accessToken?: string, forceRejoin = false) => {
      if (!connected || !publicKey) {
        setError("Please connect your wallet first")
        return
      }
      if (!isRegistered) {
        setError("User is not registered. Please wait for your anonymous ID.")
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        let nicknameToUse = newNickname
        const storedRoomData = loadRoomData(roomId)
        if (storedRoomData?.nickname) {
          nicknameToUse = storedRoomData.nickname
        }
        const storedToken = loadRoomToken(roomId)
        const tokenToUse = accessToken || storedToken || undefined
        const result = await requestJoinRoom(roomId, nicknameToUse, tokenToUse, ghostId)
        if (result.success) {
          if (result.status === "joined" && result.roomData) {
            setRoomData(result.roomData)
            setRoomCreated(true)
            setNickname(nicknameToUse)
            if (tokenToUse) {
              saveRoomToken(roomId, tokenToUse as string)
            }
            saveRoomData(roomId, { ...result.roomData, nickname: nicknameToUse })
            cancelPendingRequest()
            saveLastRoomId(roomId)
          } else if (result.status === "pending" && result.roomData) {
            handleJoinPending(result.roomData.roomId, nicknameToUse, result.roomData.roomName)
          }
        } else {
          if (result.error === "You are already in this room") {
            if (storedRoomData) {
              setRoomData(storedRoomData)
              setRoomCreated(true)
              setNickname(nicknameToUse || storedRoomData.nickname || "")
              saveLastRoomId(roomId)
            } else {
              await fetchActiveRooms()
            }
            cancelPendingRequest()
          } else {
            setError(result.error || "Failed to join room")
          }
        }
      } catch (err) {
        console.error("❌ Failed to join room:", err)
        setError("Failed to join room. Please try again.")
      } finally {
        setIsLoading(false)
      }
    },
    [
      connected, publicKey, isRegistered, ghostId, setError, setIsLoading, loadRoomData,
      loadRoomToken, saveRoomToken, saveRoomData, cancelPendingRequest, handleJoinPending,
      setRoomData, setRoomCreated, setNickname, fetchActiveRooms,
    ],
  );

  const handleSelectRoom = useCallback(
    (roomId: string) => {
      if (roomId === roomData?.roomId) return;
      const storedRoom = loadRoomData(roomId);
      const nickname = storedRoom?.nickname || "";
      handleJoinRoom(roomId, nickname, undefined, true);
    },
    [roomData, handleJoinRoom, loadRoomData]
  );

  const handleLeaveRoom = useCallback(
    async (roomIdToLeave: string) => {
      setRoomData(null);
      setRoomCreated(false);
      clearRoomData(roomIdToLeave);
      try {
        await leaveRoom(roomIdToLeave);
        const remainingRooms = usersRooms.filter((room) => room.roomId !== roomIdToLeave);
        setUsersRooms(remainingRooms);
        if (remainingRooms.length === 0) {
          setNickname("");
        }
        clearLastRoomId();
      } catch (error) {
        console.error("Error leaving room:", error);
        setError("An error occurred while leaving the room.");
      }
    },
    [usersRooms, setRoomData, setRoomCreated, clearRoomData, setError],
  );

  useEffect(() => {
    if (roomData) {
        fetchActiveRooms();
    }
  }, [roomData, fetchActiveRooms]);

  useRoomInitialization({
    isRegistered, roomData, locationState, setRoomData, setRoomCreated, setNickname,
    setUsersRooms, handleJoinRoom, setIsPendingApproval, setPendingRoomInfo, navigate,
  });

  useRoomSocket({
    setRoomData, setRoomCreated, setNickname, setIsPendingApproval, setPendingRoomInfo,
    setError, pendingRoomInfo, roomData, saveRoomToken, saveRoomData,
    clearPendingRequest: cancelPendingRequest,
  });

  return {
    roomCreated, roomData, isCreatingRoom, isLoading, error, nickname,
    isRegistered, isPendingApproval, pendingRoomInfo, mintingStatus, mockNfts,
    usersRooms, participants: roomData?.participants || [], setIsCreatingRoom,
    handleCreateRoom, 
    handleLeaveRoom, handleSelectRoom, handleJoinRoom,
    handleJoinPending, cancelPendingRequest, goBack, handleNftGenerated, toggleRoomAction,
  };
};


