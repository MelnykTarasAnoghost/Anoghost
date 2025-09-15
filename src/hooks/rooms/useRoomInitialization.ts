// src/hooks/rooms/useRoomInitialization.ts
"use client"

import { useEffect } from "react"
import { type NavigateFunction } from "react-router-dom"
import { checkActiveRooms } from "../../services/socket"
import type { RoomData } from "./useRoomLifecycle"
import { useRoomStorage } from "./useRoomStorage"

interface UseRoomInitializationProps {
  isRegistered: boolean
  roomData: RoomData | null
  locationState: any
  setRoomData: (data: RoomData | null) => void
  setRoomCreated: (created: boolean) => void
  setNickname: (nickname: string) => void
  setUsersRooms: (rooms: any[]) => void
  handleJoinRoom: (roomId: string, nickname: string, accessToken?: string, forceRejoin?: boolean) => Promise<void>
  setIsPendingApproval: (isPending: boolean) => void
  setPendingRoomInfo: (info: any) => void
  navigate: NavigateFunction
}

export const useRoomInitialization = ({
  isRegistered,
  roomData,
  locationState,
  setRoomData,
  setRoomCreated,
  setNickname,
  setUsersRooms,
  handleJoinRoom,
  setIsPendingApproval,
  setPendingRoomInfo,
  navigate,
}: UseRoomInitializationProps) => {
  const {
    getStoredRooms,
    loadPendingRequest,
    cleanupNonExistentRooms,
    saveRoomData,
  } = useRoomStorage()

  useEffect(() => {
    const initializeSession = async () => {
    //   console.log("[v3] 📊 Initialization check. Current state:", {
    //     isRegistered,
    //     hasRoomData: !!roomData,
    //     hasLocationState: !!locationState?.roomData,
    //   });

      const storedRooms = getStoredRooms();
      const storedRoomIds = storedRooms.map((room) => room.roomId);
      
      if (storedRoomIds.length > 0) {
        try {
          const response = await checkActiveRooms(storedRoomIds);
          if (response.activeRooms) {
            setUsersRooms(response.activeRooms);
            const activeRoomIds = response.activeRooms.map((room: any) => room.roomId);
            cleanupNonExistentRooms(activeRoomIds);
          } else {
            setUsersRooms([]);
            cleanupNonExistentRooms([]);
          }
        } catch (error) {
          console.error("[v3] 💥 Exception in checkActiveRooms:", error);
          setUsersRooms([]);
        }
      } else {
        setUsersRooms([]);
      }
      
      if (roomData) {
        // console.log("[v3] ⏭️ Session active. Skipping initialization.");
        if (locationState?.roomData && locationState.roomData.roomId === roomData.roomId) {
            navigate('.', { replace: true, state: {} });
        }
        return;
      }

      if (locationState?.roomData) {
        // console.log("[v3] 🎯 Initializing from locationState.", locationState.roomData);
        saveRoomData(locationState.roomData.roomId, locationState.roomData);
        setRoomData(locationState.roomData);
        setRoomCreated(true);
        setNickname(locationState.roomData.nickname ?? "");
        navigate('.', { replace: true, state: {} });
        return;
      }

      const pendingInfo = loadPendingRequest();
      if (pendingInfo) {
        console.log("[v3] ⏳ Found pending request:", pendingInfo);
        setIsPendingApproval(true);
        setPendingRoomInfo(pendingInfo);
        setNickname(pendingInfo.nickname ?? "");
        return;
      }
    };

    if (isRegistered) {
      initializeSession();
    }
  }, [
    isRegistered,
    roomData,
    locationState,
    navigate,
    setRoomData,
    setRoomCreated,
    setNickname,
    setUsersRooms,
    setIsPendingApproval,
    setPendingRoomInfo,
    getStoredRooms,
    loadPendingRequest,
    cleanupNonExistentRooms,
    saveRoomData,
  ]);
};