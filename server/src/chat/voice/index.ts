// src/chat/voice/index.ts

import type { Server as SocketIOServer, Socket } from "socket.io";
import { setupOrchestrationHandlers } from "./orchestration";
import { setupSignalingHandlers } from "./signaling";
import { setupKeysHandlers } from "./keys";

/**
 * A central setup function that initializes all voice-related socket event handlers.
 * @param socket The socket instance for a connected client.
 * @param io The main Socket.IO server instance.
 */
export function setupVoiceHandlers(socket: Socket, io: SocketIOServer) {
  setupOrchestrationHandlers(socket, io);
  setupSignalingHandlers(socket, io);
  setupKeysHandlers(socket, io);
}