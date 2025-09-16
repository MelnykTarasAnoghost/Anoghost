// src/chat/voice/signaling.ts

import type { Server as SocketIOServer, Socket } from "socket.io";
import { chatRooms, socketToRoomMap } from "../types";
import { forwardToMediasoup } from "../../services/mediasoupClient";

/**
 * Sets up handlers for real-time voice chat state changes within a room.
 */
export function setupSignalingHandlers(socket: Socket, io: SocketIOServer) {

  // User signals their intent to join the voice chat
  socket.on("voice:join", async () => {
    const roomId = socketToRoomMap.get(socket.id);
    const room = chatRooms.get(roomId || "");
    if (!room || !room.participants.has(socket.id)) return;
  
    room.voiceParticipants.set(socket.id, { socketId: socket.id, muted: false });
  
    console.log("Getting producers")
    // --- відправляємо новачку список продюсерів ---
    const { producers } = await forwardToMediasoup("getProducers", { roomId });

    // відправляємо їх новачку
    socket.emit("voice:existingProducers", producers);

  
    // повідомляємо інших
    socket.to(roomId!).emit("voice:participantJoined", {
      socketId: socket.id,
      participants: Array.from(room.voiceParticipants.values())
    });
  });
  

  // User signals their intent to leave the voice chat
  socket.on("voice:leave", () => {
    const roomId = socketToRoomMap.get(socket.id);
    const room = chatRooms.get(roomId || "");

    if (!room || !room.voiceParticipants.has(socket.id)) return;

    room.voiceParticipants.delete(socket.id);

    // Notify others
    io.to(roomId!).emit("voice:participantLeft", { socketId: socket.id });
  });

  // User signals a change in their mute state
  socket.on("voice:mute", (data: { muted: boolean }) => {
    const roomId = socketToRoomMap.get(socket.id);
    const room = chatRooms.get(roomId || "");
    const participant = room?.voiceParticipants.get(socket.id);

    if (!participant) return;

    participant.muted = data.muted;
    
    // Notify others of the state change
    socket.to(roomId!).emit("voice:muteChanged", { socketId: socket.id, muted: data.muted });
  });
}