import http from "http";
import { Server as SocketIOServer } from "socket.io";
import express, { type Express, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { setupSocketHandlers } from "./socketHandlers";
import { MAX_MESSAGE_SIZE } from "./types";
import multer from "multer";
import { getKeypairFromEnvironment } from "./getKeyPair";
import type { CreateNftServiceInput, CreatorInput, MetaDataInput } from "./nft/types";
import { createNftService } from "./mint";

import { scanNftForAccess, NftAccessStatus } from "./scanNft";
import { initializeUmi } from './nft/umi/initialize-umi';

import dotenv from "dotenv"

dotenv.config()

const PORT = process.env.PORT || 3001;
const app: Express = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"],
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: MAX_MESSAGE_SIZE,
});

setupSocketHandlers(io);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

const upload = multer({ storage: multer.memoryStorage() });
//@ts-ignore
app.post("/api/mint", async (req: Request, res: Response) => {
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
      rpcUrl: process.env.SOLANA_RPC_URL!,
      irysUrl: process.env.IRYS_URL!,
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

// @ts-ignore
app.post("/api/nft/scan", async (req: Request, res: Response) => {
  const { nftIdentifier, currentUserWalletAddress } = req.body;
  const appKeyPair = await getKeypairFromEnvironment();

  if (!nftIdentifier || !currentUserWalletAddress) {
    return res.status(400).json({ 
      status: "bad-request", 
      message: "Missing required fields: nftIdentifier and currentUserWalletAddress are required." 
    });
  }

  const masterSecret = process.env.MASTER_SECRET;
  if (!masterSecret) {
    console.error("MASTER_SECRET env var is not set for /api/nft/scan.");
    return res.status(500).json({ status: "server-error", message: "Server configuration error." });
  }

  const rpcUrl = process.env.SOLANA_RPC_URL!;
  const irysUrl = process.env.IRYS_URL!; 
  
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
        return res.status(200).json({ status: "success", message: "Access granted.", roomId: response.roomId});
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

httpServer.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
  console.log(`   WebSocket connections enabled.`);
  console.log(`   Security measures implemented.`);
  console.log(`[GhostID] System initialized`);
  console.log(`[GhostID] Rotation interval: ${300} seconds`);
});

const signals = ["SIGTERM", "SIGINT"] as const;
signals.forEach((signal) => {
  process.on(signal, () => {
    console.log(`${signal} signal received: closing HTTP server`);
    io.close(() => {
      console.log("Socket.IO server closed");
    });
    httpServer.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
});