"use client"

// src/hooks/rooms/useRoomStorage.ts
import { useCallback } from "react"
import type { RoomData } from "./useRoomLifecycle"

export const useRoomStorage = () => {
  const saveRoomData = useCallback((roomId: string, data: RoomData) => {
    localStorage.setItem(`room_data_${roomId}`, JSON.stringify(data))
  }, [])

  const loadRoomData = useCallback((roomId: string): RoomData | null => {
    const storedData = localStorage.getItem(`room_data_${roomId}`)
    return storedData ? JSON.parse(storedData) : null
  }, [])

  const clearRoomData = useCallback((roomId: string) => {
    console.log("[v0] 🗑️ Clearing room data for:", roomId)
    localStorage.removeItem(`room_data_${roomId}`)
  }, [])

  const saveRoomToken = useCallback((roomId: string, token: string) => {
    localStorage.setItem(`room_token_${roomId}`, token)
  }, [])

  const loadRoomToken = useCallback((roomId: string): string | null => {
    return localStorage.getItem(`room_token_${roomId}`)
  }, [])

  const clearRoomToken = useCallback((roomId: string) => {
    console.log("[v0] 🗑️ Clearing room token for:", roomId)
    localStorage.removeItem(`room_token_${roomId}`)
  }, [])

  const getStoredRooms = useCallback((): RoomData[] => {
    const rooms: RoomData[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("room_data_")) {
        try {
          const room = JSON.parse(localStorage.getItem(key) as string)
          rooms.push(room)
        } catch (e) {
          console.error(`Failed to parse stored room data for key: ${key}`, e)
        }
      }
    }
    return rooms
  }, [])

  const savePendingRequest = useCallback((pendingInfo: any) => {
    localStorage.setItem("pending_room_info", JSON.stringify(pendingInfo))
    localStorage.setItem("is_pending_approval", "true")
  }, [])

  const loadPendingRequest = useCallback(() => {
    const isPendingStr = localStorage.getItem("is_pending_approval")
    const pendingInfoStr = localStorage.getItem("pending_room_info")
    if (isPendingStr === "true" && pendingInfoStr) {
      try {
        const pendingInfo = JSON.parse(pendingInfoStr)
        return pendingInfo
      } catch (e) {
        console.error("Error parsing pending room info:", e)
        return null
      }
    }
    return null
  }, [])

  const clearPendingRequest = useCallback(() => {
    localStorage.removeItem("pending_room_info")
    localStorage.removeItem("is_pending_approval")
  }, [])

  const cleanupNonExistentRooms = useCallback((activeRoomIds: string[]) => {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("room_data_") || key?.startsWith("room_token_")) {
        const roomId = key.replace("room_data_", "").replace("room_token_", "")
        if (!activeRoomIds.includes(roomId)) {
          keysToRemove.push(key)
        }
      }
    }

    if (keysToRemove.length > 0) {
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key)
      })
    }
  }, [])

  // --- New functions for last-roomId ---
  const saveLastRoomId = useCallback((roomId: string) => {
    localStorage.setItem('last_room_id', roomId);
  }, []);

  const loadLastRoomId = useCallback((): string | null => {
    return localStorage.getItem('last_room_id');
  }, []);

  const clearLastRoomId = useCallback(() => {
    localStorage.removeItem('last_room_id');
  }, []);

  return {
    saveRoomData,
    loadRoomData,
    clearRoomData,
    saveRoomToken,
    loadRoomToken,
    clearRoomToken,
    getStoredRooms,
    savePendingRequest,
    loadPendingRequest,
    clearPendingRequest,
    cleanupNonExistentRooms,
    // --- Export new functions ---
    saveLastRoomId,
    loadLastRoomId,
    clearLastRoomId,
  }
}
