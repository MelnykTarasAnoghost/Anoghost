import http from "http"
import { Server as SocketIOServer } from "socket.io"
import express, { type Express, type Request, type Response } from "express"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import cors from "cors"
import { setupSocketHandlers } from "./socketHandlers"
import { MAX_MESSAGE_SIZE } from "./types"

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

// --- REST API Routes ---
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" })
})

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
