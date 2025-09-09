import { Server as SocketIOServer, Socket } from "socket.io";
import {
  userSessions,
  socketToWalletMap,
} from "../types";
import {
  sanitizeInput,
  validateNickname,
} from "../../utils/helpers";
import {
  getGhostId,
  validateGhostId,
} from "../../utils/crypto";
import { config } from "../../config";

const MASTER_SECRET = config.MASTER_SECRET;

export function setupAuthHandlers(socket: Socket, io: SocketIOServer) {
  
  socket.on("registerUser", (data: { publicKey: string }) => {
    try {
      const { publicKey } = data;
      if (!publicKey || typeof publicKey !== "string" || publicKey.length < 10) {
        socket.emit("error", { message: "Invalid public key format" });
        return;
      }
      
      // Store the user session without a nickname
      userSessions.set(socket.id, {
        socketId: socket.id,
        publicKey,
        roomTokens: [],
      });
      socketToWalletMap.set(socket.id, publicKey);

      const ghostId = getGhostId(publicKey, MASTER_SECRET);
      socket.emit("userRegistered", {
        ghostId,
      });
      console.log(`User registered (Socket: ${socket.id})`);
    } catch (error) {
      console.error("Error in registerUser:", error);
      socket.emit("error", { message: "Failed to register user" });
    }
  });

  socket.on("requestGhostId", () => {
    try {
      const userSession = userSessions.get(socket.id);
      if (!userSession) {
        socket.emit("error", { message: "You must register before requesting a Ghost ID" });
        return;
      }
      const ghostId = getGhostId(userSession.publicKey, MASTER_SECRET);
      socket.emit("ghostIdUpdated", { ghostId });
    } catch (error) {
      console.error("Error in requestGhostId:", error);
      socket.emit("error", { message: "Failed to get Ghost ID" });
    }
  });

  socket.on("forceRefreshGhostId", () => {
    try {
      const userSession = userSessions.get(socket.id);
      if (!userSession) {
        socket.emit("error", { message: "You must register before refreshing a Ghost ID" });
        return;
      }
      const ghostId = getGhostId(userSession.publicKey, MASTER_SECRET, true);
      socket.emit("ghostIdUpdated", { ghostId });
    } catch (error) {
      console.error("Error in forceRefreshGhostId:", error);
      socket.emit("error", { message: "Failed to refresh Ghost ID" });
    }
  });

  socket.on("validateGhostId", (data: { ghostId: string }) => {
    try {
      const { ghostId } = data;
      if (!ghostId || typeof ghostId !== "string") {
        socket.emit("ghostIdValidationResult", {
          success: false,
          error: "Invalid Ghost ID format",
        });
        return;
      }
      const result = validateGhostId(ghostId, MASTER_SECRET);
      if (result.isValid && result.walletAddress) {
        socket.emit("ghostIdValidationResult", {
          success: true,
          isValid: true,
          walletPreview: `${result.walletAddress.substring(0, 4)}...${result.walletAddress.length - 4}`,
        });
      } else {
        socket.emit("ghostIdValidationResult", {
          success: false,
          isValid: false,
          error: result.error || "Invalid or expired Ghost ID",
        });
      }
    } catch (error) {
      console.error("Error validating Ghost ID:", error);
      socket.emit("ghostIdValidationResult", {
        success: false,
        error: "Failed to validate Ghost ID",
      });
    }
  });

}