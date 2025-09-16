// src/hooks/rooms/useRoomUI.ts
import { useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";

export const useRoomUI = () => {
  const navigate = useNavigate();
  const [isCreatingRoom, setIsCreatingRoom] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toggleRoomAction = useCallback(() => {
    setIsCreatingRoom((prev) => !prev);
    setError(null);
  }, []);

  const goBack = useCallback(() => navigate("/c"), [navigate]);

  return {
    isCreatingRoom,
    setIsCreatingRoom,
    error,
    setError,
    toggleRoomAction,
    goBack,
  };
};