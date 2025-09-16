// server/src/api/routes.ts

import { Express, Request, Response } from "express";
import { getKeypairFromEnvironment } from "../utils/getKeypair";
import { createNftService } from "../nft/mint";
import { scanNftForAccess, NftAccessStatus } from "../nft/scanNft"; // Corrected import path
import { initializeUmi } from "../nft/umi/initialize-umi";
import { CreateNftServiceInput, MetaDataInput } from "../nft/types";
import { config } from "../config";

// This function takes the Express app as an argument and attaches all API routes to it.
export function setupApiRoutes(app: Express) {

  app.post("/api/mint", async (req: any, res: any) => {
    const appKeyPair = await getKeypairFromEnvironment();
    try {
      if (!appKeyPair) {
        console.error("CRITICAL: appKeyPair is not initialized on the server.");
        return res.status(500).json({ error: "Server keypair not configured." });
      }

      const { name, ghosts, roomId } = req.body;
      if (!name || !ghosts || !roomId) {
        return res.status(400).json({ error: "Missing required fields: name, ghosts, roomId." });
      }

      const fixedDescription = `YOUR GHOST SUITE FOR ROOM ${name} \n This will keep you completely unknown to other partcipants \n BE CAREFUL: Sharing this key leads to permanent ban \n Have a nice and producative conversation`;
      const metaDataForService: MetaDataInput = {
        name: name as string,
        description: fixedDescription,
        imageUri: "https://gateway.irys.xyz/DgN5feFgC6Rd2CfRi5f3DZJahC8LeQrHaqNbGeymSctz",
        symbol: "ANOGHOST",
        externalUri: "https://your-platform-url.com/info",
        attributes: [],
        collection: undefined,
        properties: {
          category: "image",
          creators: [{ address: appKeyPair.publicKey.toString(), share: 100, verified: true }],
        },
        sellerFeeBasisPoints: 0,
      };

      const serviceInput: CreateNftServiceInput & { roomId: string } = {
        metaData: metaDataForService,
        ghosts,
        rpcUrl: config.SOLANA_RPC_URL!,
        irysUrl: config.IRYS_URL!,
        appKeyPair: appKeyPair,
        unchangable: true,
        roomId
      };

      const result = await createNftService(serviceInput);
      res.json(result);
    } catch (error: any) {
      console.error("NFT minting failed in /api/mint route:", error);
      res.status(500).json({ error: "Internal Server Error", details: error.message || "Minting error." });
    }
  });

  app.post("/api/nft/scan", async (req: any, res: any) => {
    const { nftIdentifier, currentUserWalletAddress } = req.body;
    const appKeyPair = await getKeypairFromEnvironment();

    if (!nftIdentifier || !currentUserWalletAddress) {
      return res.status(400).json({
        status: "bad-request",
        message: "Missing required fields: nftIdentifier and currentUserWalletAddress are required."
      });
    }

    const masterSecret = config.MASTER_SECRET;
    if (!masterSecret) {
      console.error("MASTER_SECRET env var is not set for /api/nft/scan.");
      return res.status(500).json({ status: "server-error", message: "Server configuration error." });
    }

    const rpcUrl = config.SOLANA_RPC_URL!;
    const irysUrl = config.IRYS_URL!;

    let umi = initializeUmi(rpcUrl, irysUrl, appKeyPair);

    try {
      const response: NftAccessStatus = await scanNftForAccess(
        nftIdentifier,
        currentUserWalletAddress,
        masterSecret,
        umi
      );

      switch (response.status) {
        case "success":
          return res.status(200).json({ status: "success", message: "Access granted.", roomId: response.roomId });
        case "illegal-owner":
          return res.status(403).json({ status: "illegal-owner", message: "Access denied: Wallet does not match NFT's intended owner." });
        case "invalid-room":
          return res.status(403).json({ status: "invalid-room", message: "Access denied: Room information associated with NFT is invalid or missing." });
        case "nft-not-found":
          return res.status(404).json({ status: "nft-not-found", message: "NFT not found." });
        case "nft-invalid-structure":
          return res.status(400).json({ status: "nft-invalid-structure", message: "NFT metadata is malformed or missing required attributes for access control." });
        case "metadata-fetch-error":
          return res.status(502).json({ status: "metadata-fetch-error", message: "Failed to fetch or parse NFT metadata from external source." });
        case "server-error":
        default:
          return res.status(500).json({ status: "server-error", message: "An internal server error occurred during NFT scan." });
      }
    } catch (error: any) {
      console.error("Error in /api/nft/scan route:", error);
      return res.status(500).json({ status: "server-error", message: "An unexpected error occurred.", details: error.message });
    }
  });
}