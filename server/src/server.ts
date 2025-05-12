import http from "http"
import { Server as SocketIOServer } from "socket.io"
import express, { type Express, type Request, type Response } from "express"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import cors from "cors"
import { setupSocketHandlers } from "./socketHandlers"
import { MAX_MESSAGE_SIZE } from "./types"
import multer from "multer"
import { getKeypairFromEnvironment } from "./getKeyPair"
import { CreateNftServiceInput, CreatorInput, MetaDataInput } from "./nft/types"
import { createNftService } from "./mint"

const PORT = process.env.PORT || 3001

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== "production"
if (isDevelopment) {
  console.log("🧪 Running in DEVELOPMENT mode with mock NFT generation enabled")
}

const app: Express = express()

// Security middleware
app.use(helmet()) // Set security headers
app.use(express.json({ limit: "1mb" })) // Limit JSON body size
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"],
  }),
)

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
})
app.use("/api", apiLimiter)

const httpServer = http.createServer(app)

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: MAX_MESSAGE_SIZE, // Allow large messages
})

// Set up socket handlers
setupSocketHandlers(io)

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" })
})


const upload = multer({ storage: multer.memoryStorage() })

//@ts-ignore
app.post("/api/mint", upload.single("imageFile"), async (req: Request, res: Response) => {
  const appKeyPair = await getKeypairFromEnvironment()

  try {
      if (!appKeyPair) {
          console.error("CRITICAL: appKeyPair is not initialized on the server.");
          return res.status(500).json({ error: "Server keypair not configured. This is a server-side issue." });
      }

      const {
          name,
          description,
          symbol,
          external_url,
          attributes,
          collectionKey,
          propertyCreators,
          sellerFeeBasisPoints,
          recipients: serviceRecipientsPayload,
      } = req.body;

      const fixedImageUri = "https://gateway.irys.xyz/DgN5feFgC6Rd2CfRi5f3DZJahC8LeQrHaqNbGeymSctz";
      const fixedUnchangable = true;
      const fixedTransferableWallets = ["5MqevyFxj2egKbgmtCGwANqUSBCJ9ebL1LMMrcLtvWJN"];

      if (!name || !description || !symbol) {
          return res.status(400).json({ error: "Missing required fields: name, description, and symbol are required." });
      }

      const parsedSellerFeeBasisPoints = sellerFeeBasisPoints ? parseInt(sellerFeeBasisPoints as string, 10) : 500;

      let parsedAttributes: MetaDataInput['attributes'] = [];
      if (attributes) {
          try {
              parsedAttributes = JSON.parse(attributes as string);
          } catch (e) {
              return res.status(400).json({ error: "Invalid JSON format for attributes." });
          }
      }

      const parsedCollection: MetaDataInput['collection'] | undefined = collectionKey
          ? { key: collectionKey as string }
          : undefined;

      let parsedPropertyCreators: CreatorInput[] = [{ address: appKeyPair.publicKey.toString(), share: 100, verified: true }];
      if (propertyCreators) {
          try {
              const tempCreators = JSON.parse(propertyCreators as string);
              if (Array.isArray(tempCreators) && tempCreators.every(c => typeof c.address === 'string' && typeof c.share === 'number')) {
                  parsedPropertyCreators = tempCreators;
              } else {
                  throw new Error("Each creator must have an address and a share.");
              }
          } catch (e: any) {
              return res.status(400).json({ error: `Invalid JSON format for propertyCreators: ${e.message}` });
          }
      }
      const metaDataForService: MetaDataInput = {
          name,
          description,
          imageUri: fixedImageUri,
          symbol,
          externalUri: external_url,
          attributes: parsedAttributes,
          collection: parsedCollection,
          properties: {
              category: "image",
              creators: parsedPropertyCreators,
          },
          sellerFeeBasisPoints: parsedSellerFeeBasisPoints,
      };

      const serviceInput: CreateNftServiceInput = {
          metaData: metaDataForService,
          recipients: JSON.parse(serviceRecipientsPayload),
          rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
          irysUrl: process.env.IRYS_URL || "https://devnet.irys.xyz",
          appKeyPair: appKeyPair,
          transferableWallets: fixedTransferableWallets,
          unchangable: fixedUnchangable,
      };

      const result = await createNftService(serviceInput);

      res.json(result);

  } catch (error: any) {
      console.error("NFT minting failed in /api/mint route:", error);
      const errorMessage = error.message || "An unexpected error occurred during NFT minting.";
      res.status(500).json({ error: "Internal Server Error", details: errorMessage });
  }
});
// Start the server
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`)
  console.log(`   WebSocket connections enabled.`)
  console.log(`   Security measures implemented.`)
})

// Graceful shutdown
const signals = ["SIGTERM", "SIGINT"] as const
signals.forEach((signal) => {
  process.on(signal, () => {
    console.log(`${signal} signal received: closing HTTP server`)
    io.close(() => {
      console.log("Socket.IO server closed")
    })
    httpServer.close(() => {
      console.log("HTTP server closed")
      process.exit(0)
    })
  })
})
