// src/chat/voice/orchestration.ts

import type { Server as SocketIOServer, Socket } from "socket.io";
import { userSessions, socketToRoomMap } from "../types";
import { forwardToMediasoup } from "../../services/mediasoupClient";

/**
 * Sets up handlers that orchestrate WebRTC setup between clients and the Mediasoup microservice.
 */
export function setupOrchestrationHandlers(socket: Socket, io: SocketIOServer) {
  
  // Client asks for the media server's capabilities
  socket.on("voice:getRtpCapabilities", async (callback) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) return callback({ error: "Not in a room" });

    try {
      const capabilities = await forwardToMediasoup("getRouterRtpCapabilities", { roomId });
      callback(capabilities);
    } catch (error) {
      console.error("Orchestration error getting RTP capabilities:", error);
      callback({ error: "Could not get media server capabilities" });
    }
  });

  // Client requests to create a transport for sending/receiving media
  socket.on("voice:createTransport", async (callback) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) return callback({ error: "Not in a room" });

    try {
      const transportOptions = await forwardToMediasoup("createWebRtcTransport", { roomId });
      callback(transportOptions);
    } catch (error) {
      console.error("Orchestration error creating transport:", error);
      callback({ error: "Could not create media transport" });
    }
  });

  // Client provides DTLS parameters to connect the transport
  socket.on("voice:connectTransport", async (data: { transportId: string; dtlsParameters: any }, callback) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) return;
    
    try {
     console.log('[SERVER] connectTransport called:', data.transportId);
      await forwardToMediasoup("connectTransport", { 
        roomId, 
        transportId: data.transportId, 
        dtlsParameters: data.dtlsParameters 
      });
      console.log('[SERVER] Transport connected:', data.transportId);
      callback(null); 
    } catch (error) {
      console.error("Orchestration error connecting transport:", error);
    }
  });

  // Client is ready to send audio
  socket.on("voice:produce", async (data: { transportId: string; kind: string; rtpParameters: any }, callback) => {
    const userSession = userSessions.get(socket.id);
    const roomId = socketToRoomMap.get(socket.id);
    if (!userSession || !roomId) return callback({ error: "Invalid session or room" });

    try {
      console.log("[SERVER] voice:produce request:", data);
      const { id: producerId } = await forwardToMediasoup("produce", {
        roomId,
        transportId: data.transportId,
        kind: data.kind,
        rtpParameters: data.rtpParameters,
        appData: { socketId: socket.id, publicKey: userSession.publicKey }
      });
      console.log("[SERVER] voice:produce success:", producerId);
      // **IMPORTANT**: Notify other clients in the room that a new producer is available.
      socket.to(roomId).emit("voice:newProducer", { producerId, socketId: socket.id });

      callback({ id: producerId });
    } catch (error) {
      console.error("Orchestration error producing stream:", error);
      callback({ error: "Could not produce audio stream" });
    }
  });
  
  /**
   * --- NEW HANDLER ---
   * A client wants to consume (receive) an existing producer's stream.
   */
  socket.on("voice:consume", async (data: { transportId: string; producerId: string; rtpCapabilities: any }, callback) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) return callback({ error: "Not in a room" });
    
    try {
      const consumerOptions = await forwardToMediasoup('consume', {
        roomId,
        transportId: data.transportId,
        producerId: data.producerId,
        rtpCapabilities: data.rtpCapabilities
      });
      callback(consumerOptions);
    } catch (error) {
      console.error("Orchestration error consuming stream:", error);
      callback({ error: "Could not create consumer" });
    }
  });

  // Client tells server "ok, I’m ready, resume my consumer"
    socket.on("voice:resume", async ({ consumerId }, callback) => {
        const roomId = socketToRoomMap.get(socket.id);
        if (!roomId) return callback({ error: "Not in a room" });
    
        try {
        await forwardToMediasoup("resumeConsumer", { roomId, consumerId });
        callback({ ok: true });
        } catch (error) {
        console.error("Orchestration error resuming consumer:", error);
        callback({ error: "Could not resume consumer" });
        }
    });
  
}