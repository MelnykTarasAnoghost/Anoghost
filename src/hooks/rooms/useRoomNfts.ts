// src/hooks/rooms/useRoomNfts.ts
import { useState, useCallback } from "react";
import { mintNftAccessPasses as apiMintNfts } from "../../api/apiNft";

export const useRoomNfts = (API_URL: string) => {
  const [mintingStatus, setMintingStatus] = useState<string>("");
  const [mockNfts, setMockNfts] = useState<any[]>([]);

  const mintNftAccessPasses = useCallback(
    async (roomId: string, roomName: string, ghostIds: string[]): Promise<void> => {
      if (ghostIds.length === 0) return;
      setMintingStatus(`Minting ${ghostIds.length} NFT access passes...`);
      try {
        const mintedNfts = await apiMintNfts(API_URL, roomId, roomName, ghostIds);
        setMockNfts(mintedNfts);
        setMintingStatus("NFT access passes created successfully!");
      } catch (err) {
        console.error("❌ Minting failed:", err);
        setMintingStatus("Failed to mint NFT access passes.");
        throw err;
      }
    },
    [API_URL]
  );

  const handleNftGenerated = useCallback((nft: any) => {
    setMockNfts((prev) => [...prev, nft]);
  }, []);

  return {
    mintingStatus,
    mockNfts,
    mintNftAccessPasses,
    handleNftGenerated,
    setMockNfts,
  };
};