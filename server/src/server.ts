// server/src/server.ts

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import express, { type Express, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import { config } from './config';

import { setupSocketHandlers } from "./chat";
import { setupApiRoutes } from "./api/routes";
import { MAX_MESSAGE_SIZE } from "./chat/types";
import { getKeypairFromEnvironment } from "./utils/getKeypair";

dotenv.config();

const app: Express = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: config.NODE_ENV === "production" ? config.FRONTEND_URL : "*",
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
    origin: config.NODE_ENV === "production" ? config.FRONTEND_URL : "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: MAX_MESSAGE_SIZE,
});

// Correctly calling the setup functions
setupSocketHandlers(io);
setupApiRoutes(app); 

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

httpServer.listen({
  port: config.PORT,
  host: '0.0.0.0'
}, async () => {
  console.log(`🚀 Backend server is running on http://0.0.0.0:${config.PORT}`);
  console.log(`  WebSocket connections enabled.`);
  console.log(`  Security measures implemented.`);
  console.log(`[GhostID] System initialized`);
  console.log(`[GhostID] Rotation interval: ${300} seconds`);
  console.log(config.IRYS_URL)
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