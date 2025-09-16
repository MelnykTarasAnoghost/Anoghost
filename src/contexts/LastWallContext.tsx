// src/contexts/LastWallContext.tsx
import { createContext, useState, useContext, ReactNode } from "react";

type RoomContextType = {
  wallKeys: Map<string, string>; // Use a map to store keys for each room
  setWallKey: (roomId: string, key: string) => void;
};

// Create the context
const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function useLastWall(roomId: string) {
  // Pass roomId to the hook
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useLastWall must be used within a LastWallContext");
  }

  const { wallKeys, setWallKey: setContextWallKey } = context;

  const wallKey = wallKeys.get(roomId);

  // Memoize a specific setter for this room to avoid re-renders
  const setWallKey = (key: string) => {
    setContextWallKey(roomId, key);
  };

  return { wallKey, setWallKey };
}

const LastWallContext = ({ children }: { children: ReactNode }) => {
  const [wallKeys, setWallKeys] = useState<Map<string, string>>(new Map());

  const setWallKey = (roomId: string, key: string) => {
    setWallKeys((prevKeys) => {
      const newKeys = new Map(prevKeys);
      newKeys.set(roomId, key);
      return newKeys;
    });
  };

  return (
    <RoomContext.Provider value={{ wallKeys, setWallKey }}>
      {children}
    </RoomContext.Provider>
  );
};

export default LastWallContext;
