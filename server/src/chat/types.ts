// --- Data Structures ---
export interface UserSession {
  socketId: string;
  publicKey: string;
  roomTokens: string[]; // Tokens for rooms this user can access
}

export interface ChatRoomParticipant {
  socketId: string;
  publicKey: string; // Stored but never shared with other clients
  nickname: string;
  joinedAt: number;
}

export interface PendingParticipant {
  socketId: string;
  publicKey: string;
  nickname: string;
  requestedAt: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  createdAt: number;
  creatorPublicKey: string; // Stored but never shared
  creatorSocketId: string; // Socket ID of the room creator
  participants: Map<string, ChatRoomParticipant>; // socketId -> participant
  pendingParticipants: Map<string, PendingParticipant>; // socketId -> pending participant
  accessTokens: Set<string>; // Valid access tokens for this room
  isPrivate: boolean; // Whether the room requires approval to join
  voiceParticipants: Map<string, { socketId: string; muted: boolean }>
}

// NOTE: MessageChunk and StoredFile interfaces are no longer needed
// as file data is not stored on the server.

// Global data stores
export const userSessions = new Map<string, UserSession>();
export const chatRooms = new Map<string, ChatRoom>();
export const socketToRoomMap = new Map<string, string>();
// NOTE: `pendingMessages` is no longer needed
export const socketToWalletMap = new Map<string, string>();
// NOTE: `filesStorage` is no longer needed
export const messageOwnership = new Map<string, string>(); // Нове сховище для відправників

// Constants
export const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB max message size
export const MAX_CHUNK_SIZE = 64 * 1024; // 64KB chunks for large data
// NOTE: FILE_EXPIRATION_TIME is no longer needed for server storage,
// but can be used for client-side expiration logic if desired.