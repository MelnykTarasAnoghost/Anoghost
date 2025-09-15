// src/hooks/rooms/useRoomPending.ts
import { useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { useRoomStorage } from "./useRoomStorage";

export const useRoomPending = () => {
  const { savePendingRequest, clearPendingRequest, loadPendingRequest } = useRoomStorage();
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [pendingRoomInfo, setPendingRoomInfo] = useState<{
    roomId: string;
    roomName?: string;
    nickname: string;
  } | null>(null);

  const handleJoinPending = useCallback(
    (roomId: string, nickname: string, roomName?: string) => {
      const info = { roomId, roomName, nickname };
      setIsPendingApproval(true);
      setPendingRoomInfo(info);
      savePendingRequest(info);
    },
    [savePendingRequest]
  );

  const cancelPendingRequest = useCallback(() => {
    setIsPendingApproval(false);
    setPendingRoomInfo(null);
    clearPendingRequest();
  }, [clearPendingRequest]);

  const restorePendingState = useCallback(() => {
    const pendingInfo = loadPendingRequest();
    if (pendingInfo) {
      setIsPendingApproval(true);
      setPendingRoomInfo(pendingInfo);
      return pendingInfo;
    }
    return null;
  }, [loadPendingRequest]);

  return {
    isPendingApproval,
    setIsPendingApproval: setIsPendingApproval as Dispatch<SetStateAction<boolean>>,
    pendingRoomInfo,
    setPendingRoomInfo: setPendingRoomInfo as Dispatch<SetStateAction<any>>,
    handleJoinPending,
    cancelPendingRequest,
    restorePendingState,
  };
};