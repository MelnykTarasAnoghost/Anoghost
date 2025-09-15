"use client";

import type React from "react";
import { useState, useEffect } from "react";
import LeftSidebar from "./LeftSidebar";
import ChatArea from "../chat/ChatArea";
import RightSidebar from "./RightSidebar";
import { MessageSquare } from "lucide-react";
import LastWallContext from "@/contexts/LastWallContext";

// Define the shape of a single room for the sidebar list
interface UserRoom {
  roomId: string;
  roomName: string;
  participantCount: number;
}

interface RoomData {
  roomId: string;
  roomName: string;
  accessToken?: string;
  participants: Array<{ nickname: string; joinedAt: number }>;
  pendingParticipants?: Array<{
    id: string;
    nickname: string;
    requestedAt: number;
  }>;
  isCreator?: boolean;
}

interface ChatLayoutProps {
  roomData: RoomData | null;
  nickname: string;
  pendingParticipants: Array<{
    id: string;
    nickname: string;
    requestedAt: number;
  }>;
  isCreator: boolean;
  mockNfts: any[];
  onNftGenerated: (nft: any) => void;
  participants: Array<{ nickname: string; joinedAt: number }>;
  usersRooms: UserRoom[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
}

const ChatPlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 bg-[#0A0A0A] flex-1">
    <MessageSquare size={48} className="mb-4 text-gray-600" />
    <h2 className="text-xl font-semibold text-gray-300">Welcome!</h2>
    <p>Select a room from the sidebar to start chatting.</p>
  </div>
);

const ChatLayout: React.FC<ChatLayoutProps> = ({
  roomData,
  nickname,
  pendingParticipants,
  isCreator,
  mockNfts,
  participants,
  onNftGenerated,
  usersRooms,
  activeRoomId,
  onSelectRoom,
  onLeaveRoom,
}) => {
  const [isMobileLeftSidebarOpen, setIsMobileLeftSidebarOpen] = useState(false);
  const [isMobileRightSidebarOpen, setIsMobileRightSidebarOpen] =
    useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobileView();
    window.addEventListener("resize", checkMobileView);
    return () => {
      window.removeEventListener("resize", checkMobileView);
    };
  }, []);

  return (
    <LastWallContext>
      <div className="flex h-screen w-screen bg-black overflow-hidden">
        <div
          className={`${
            isMobileLeftSidebarOpen
              ? "fixed inset-0 z-50 flex flex-col w-full md:w-64 md:static"
              : "hidden md:flex md:w-64"
          } border-r border-[#1a1a1a] bg-[#0A0A0A] flex-col`}
        >
          <LeftSidebar
            usersRooms={usersRooms}
            activeRoomId={activeRoomId}
            onSelectRoom={onSelectRoom}
            nickname={nickname}
            onClose={() => setIsMobileLeftSidebarOpen(false)}
          />
        </div>

        <div className="flex-1 flex flex-col">
          {roomData ? (
            <ChatArea
              roomData={{
                ...roomData,
                participants: participants,
              }}
              nickname={nickname}
              onToggleLeftSidebar={() =>
                setIsMobileLeftSidebarOpen(!isMobileLeftSidebarOpen)
              }
              onToggleRightSidebar={() =>
                setIsMobileRightSidebarOpen(!isMobileRightSidebarOpen)
              }
              isCreator={isCreator}
            />
          ) : (
            <ChatPlaceholder />
          )}
        </div>

        {roomData && (
          <div
            className={`${
              isMobileRightSidebarOpen
                ? "fixed inset-0 z-50 flex flex-col w-full min-[920px]:w-80 min-[920px]:static syka"
                : "hidden min-[920px]:flex md:w-80"
            } border-l border-[#1a1a1a] bg-[#0A0A0A] flex-col `}
          >
            <RightSidebar
              roomData={roomData}
              participants={participants}
              pendingParticipants={pendingParticipants}
              isCreator={isCreator}
              onClose={() => setIsMobileRightSidebarOpen(false)}
              onNftGenerated={onNftGenerated}
              onLeaveRoom={onLeaveRoom}
            />
          </div>
        )}

        {(isMobileLeftSidebarOpen || isMobileRightSidebarOpen) && isMobile && (
          <div
            className="fixed inset-0 bg-black/70 z-40"
            onClick={() => {
              setIsMobileLeftSidebarOpen(false);
              setIsMobileRightSidebarOpen(false);
            }}
          />
        )}
      </div>
    </LastWallContext>
  );
};

export default ChatLayout;
