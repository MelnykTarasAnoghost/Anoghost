// src/hooks/rooms/useRoomSocket.ts
import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useSocket } from "../../services/socket";
import type { RoomData } from "./useRoomLifecycle";
import { useGhostNest } from "@/contexts/GhostNestContext";

interface UseRoomSocketProps {
  setRoomData: Dispatch<SetStateAction<RoomData | null>>;
  setRoomCreated: Dispatch<SetStateAction<boolean>>;
  setNickname: Dispatch<SetStateAction<string>>;
  setIsPendingApproval: Dispatch<SetStateAction<boolean>>;
  setPendingRoomInfo: Dispatch<SetStateAction<any>>;
  setError: Dispatch<SetStateAction<string | null>>;
  pendingRoomInfo: any;
  roomData: RoomData | null;
  saveRoomToken: (roomId: string, token: string) => void;
  saveRoomData: (roomId: string, data: RoomData) => void;
  clearPendingRequest: () => void;
}

export const useRoomSocket = ({
  setRoomData,
  setRoomCreated,
  setNickname,
  setIsPendingApproval,
  setPendingRoomInfo,
  setError,
  pendingRoomInfo,
  roomData,
  saveRoomToken,
  saveRoomData,
  clearPendingRequest,
}: UseRoomSocketProps) => {
  const { API_URL: nest } = useGhostNest();
  const { socket, connect } = useSocket(nest);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (!socket) return;

    const handleJoinRequestApproved = (data: any) => {
      console.log("[v3] SOCKET EVENT: joinRequestApproved", data);
      const newRoomData = {
        ...data,
        isCreator: data.isCreator !== undefined ? data.isCreator : roomData?.isCreator || false,
        participants: [...(data.participants || [])],
      };

      setRoomData(newRoomData);
      setRoomCreated(true);

      const userNickname = data.nickname || pendingRoomInfo?.nickname || "";
      setNickname(userNickname);

      if (data.accessToken) {
        saveRoomToken(data.roomId, data.accessToken);
      }
      saveRoomData(data.roomId, { ...newRoomData, nickname: userNickname });
      clearPendingRequest();
    };

    const handleJoinRequestRejected = (data: any) => {
      console.log("[v3] SOCKET EVENT: joinRequestRejected", data);
      setIsPendingApproval(false);
      setPendingRoomInfo(null);
      setError(`Your request to join "${data.roomName}" was rejected.`);
      clearPendingRequest();
    };

    const handlePendingJoinRequest = (data: any) => {
      console.log("[v3] SOCKET EVENT: pendingJoinRequest", data);
      setRoomData((prev) =>
        prev && prev.roomId === data.roomId ? { ...prev, pendingParticipants: data.pendingParticipants } : prev
      );
    };

    const handleRoomCreatorChanged = (data: any) => {
      console.log("[v3] SOCKET EVENT: roomCreatorChanged", data);
      setRoomData((prev) =>
        prev && prev.roomId === data.roomId
          ? { ...prev, isCreator: data.isCreator, pendingParticipants: data.pendingParticipants }
          : prev
      );
    };

    const onUserJoined = (data: any) => {
      console.log("[v3] SOCKET EVENT: userJoinedRoom", data);
      setRoomData((prevRoomData) => {
        if (prevRoomData && prevRoomData.roomId === data.roomId) {
          return { ...prevRoomData, participants: [...data.participants] };
        }
        return prevRoomData;
      });
    };

    const onUserLeft = (data: any) => {
      console.log("[v3] SOCKET EVENT: userLeftRoom", data);
      setRoomData((prevRoomData) => {
        if (prevRoomData && prevRoomData.roomId === data.roomId) {
          return { ...prevRoomData, participants: [...data.participants] };
        }
        return prevRoomData;
      });
    };

    socket.on("userJoinedRoom", onUserJoined);
    socket.on("userLeftRoom", onUserLeft);
    socket.on("joinRequestApproved", handleJoinRequestApproved);
    socket.on("joinRequestRejected", handleJoinRequestRejected);
    socket.on("pendingJoinRequest", handlePendingJoinRequest);
    socket.on("roomCreatorChanged", handleRoomCreatorChanged);

    return () => {
      socket.off("userJoinedRoom", onUserJoined);
      socket.off("userLeftRoom", onUserLeft);
      socket.off("joinRequestApproved", handleJoinRequestApproved);
      socket.off("joinRequestRejected", handleJoinRequestRejected);
      socket.off("pendingJoinRequest", handlePendingJoinRequest);
      socket.off("roomCreatorChanged", handleRoomCreatorChanged);
    };
  }, [
    socket,
    roomData,
    pendingRoomInfo,
    setRoomData,
    setRoomCreated,
    setNickname,
    setIsPendingApproval,
    setPendingRoomInfo,
    setError,
    saveRoomToken,
    saveRoomData,
    clearPendingRequest,
  ]);
};