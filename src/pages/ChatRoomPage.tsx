"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import JoinRoomModal from "@/components/forms/join-room/join-room-modal";
import ChatLayout from "../components/chat-layout/ChatLayout";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useChatRoom } from "../contexts/ChatRoomContext";
import { useEffect, useRef, useState } from "react";
import { useGhostId } from "../contexts/GhostIdContext";
import { leaveRoom } from "@/services/socket";

// The core component that uses the context
const ChatRoomPage = () => {
  const {
    roomData,
    error,
    nickname,
    isPendingApproval,
    pendingRoomInfo,
    mockNfts,
    participants,
    usersRooms,
    handleLeaveRoom,
    handleJoinPending,
    handleJoinRoom,
    cancelPendingRequest,
    goBack,
    handleNftGenerated,
    handleSelectRoom,
  } = useChatRoom();

  const { connected } = useWallet();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const { isRegistered } = useGhostId();
  // const isReloading = useRef(false);

  // useEffect(() => {
  //   const handleBeforeUnload = () => {
  //     isReloading.current = true;
  //   };

  //   window.addEventListener("beforeunload", handleBeforeUnload);
  //   return () => {
  //     window.removeEventListener("beforeunload", handleBeforeUnload);

  //     // cleanup = leaving component
  //     if (!isReloading.current && roomData?.roomId) {
  //       leaveRoom(roomData.roomId);
  //     }
  //   };
  // }, [roomData, leaveRoom]);


  // Show chat interface if user is registered AND has an active room OR a list of rooms to select from
  const showChatInterface = isRegistered && (!!roomData || usersRooms.length > 0);
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center">
      {showChatInterface ? (
        <ChatLayout
          roomData={roomData}
          nickname={nickname}
          pendingParticipants={roomData?.pendingParticipants || []}
          participants={participants}
          isCreator={roomData?.isCreator || false}
          mockNfts={mockNfts}
          onNftGenerated={handleNftGenerated}
          usersRooms={usersRooms}
          activeRoomId={roomData?.roomId || null}
          onSelectRoom={handleSelectRoom}
          onLeaveRoom={() => roomData && handleLeaveRoom(roomData.roomId)}
        />
      ) : (
        <div className="w-full max-w-md h-auto max-h-screen p-4">
          {error && (
            <div className="mb-4 p-3 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-md text-[#FF4D00] text-sm flex items-start">
              <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {isPendingApproval && pendingRoomInfo ? (
            <div className="p-6 text-center bg-black border border-[#222222] rounded-md relative">
              <button onClick={goBack} className="absolute top-3 left-3 p-2 text-gray-400 hover:text-[#FF4D00] transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div className="mb-6 mt-6">
                <div className="h-16 w-16 mx-auto rounded-full border border-[#FF4D00] flex items-center justify-center">
                  <Loader2 size={24} className="text-[#FF4D00] animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-3">Waiting for Approval</h3>
              <p className="mb-4 text-gray-400 max-w-md mx-auto">
                Your request to join <span className="text-white">{pendingRoomInfo.roomName}</span> is pending approval by the room creator.
              </p>
              <button onClick={cancelPendingRequest} className="bg-[#111111] hover:bg-[#222222] text-white font-medium py-2 px-6 rounded-md transition-colors border border-[#333333]">
                Cancel Request
              </button>
            </div>
          ) : (
            <div className="bg-black border border-[#222222] rounded-md relative">
              <button onClick={goBack} className="absolute top-3 left-3 p-2 text-gray-400 hover:text-[#FF4D00] transition-colors z-10">
                <ArrowLeft size={18} />
              </button>
              <div className="text-center p-4 pt-10 pb-2">
                <h2 className="text-xl font-bold mb-1">Next level of <span className="text-[#FF4D00]">crypto</span> chat</h2>
                <p className="text-gray-400 text-xs max-w-lg mx-auto">
                  Join an existing chat room with your anonymous identity
                </p>
              </div>
              <div className="p-4">
                {!connected && (
                  <div className="mb-4 text-center">
                    <p className="text-gray-400 mb-4 text-sm max-w-md mx-auto">Connect your Solana wallet to join anonymous chat rooms.</p>
                    <div className="flex justify-center">
                      <WalletMultiButton className="!bg-[#FF4D00] !text-black !font-medium !py-2 !px-6 !rounded-md !transition-all !border-none !text-sm" />
                    </div>
                  </div>
                )}
                {connected && isRegistered && (
                  <div className="flex flex-col items-center space-y-4 py-2">
                    <div className="border border-[#222222] p-4 rounded-md w-full">
                      <h3 className="text-base font-medium mb-3 text-center">Join a Chat Room</h3>
                      <p className="text-center text-gray-400 mb-4 text-sm">Enter a room ID to join an existing chat room.</p>
                      <button onClick={() => setIsJoinModalOpen(true)} className="w-full bg-[#FF4D00] text-black font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center">
                        Join Existing Room
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinSuccess={(joinedRoomData, nickname) => {
          handleJoinRoom(joinedRoomData.roomId, nickname, joinedRoomData.accessToken);
          setIsJoinModalOpen(false);
        }}
        onJoinPending={(roomInfo, nickname) => {
          handleJoinPending(roomInfo.roomId, nickname, roomInfo.roomName);
          setIsJoinModalOpen(false);
        }}
      />
    </div>
  );
};

export default ChatRoomPage;