// Type definition for the minting response
interface MintResponse {
  nfts: Array<{
    mint: string;
    recipient: string;
    roomId: string;
    createdAt: number;
  }>;
}

// Type definition for NFT verification response
interface NftScanResponse {
  status: "success" | "failure";
  message?: string;
  reason?: string;
  roomId?: string;
}

// Function to mint NFT access passes
export const mintNftAccessPasses = async (
  apiUrl: string,
  roomId: string,
  roomName: string,
  ghostIds: string[]
): Promise<MintResponse["nfts"]> => {
  if (!apiUrl) throw new Error("API URL is not configured.");

  const res = await fetch(`${apiUrl}/api/mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: roomName,
      ghosts: ghostIds,
      roomId,
    }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error ?? `Minting failed with code ${res.status}`);
  }

  const data: MintResponse = await res.json();
  return data.nfts;
};

// Function to verify an NFT and get the associated room ID
export const verifyNftAccessPass = async (
  apiUrl: string,
  nftIdentifier: string,
  currentUserWalletAddress: string
): Promise<NftScanResponse> => {
  if (!apiUrl) throw new Error("API URL is not configured.");

  const verifyResponse = await fetch(`${apiUrl}/api/nft/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nftIdentifier,
      currentUserWalletAddress,
    }),
  });

  const verifyData: NftScanResponse = await verifyResponse.json();
  return verifyData;
};