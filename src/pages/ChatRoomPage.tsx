"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import JoinRoomModal from "../components/JoinRoomModal";
import ChatRoomForm from "../components/ChatRoomForm";
import ChatLayout from "../components/chat-layout/ChatLayout";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useChatRoom } from "../contexts/ChatRoomContext";
import { useState } from "react";
import { useGhostId } from "../contexts/GhostIdContext";

// The core component that uses the context
const ChatRoomPage = () => {
  const {
    roomCreated,
    roomData,
    isCreatingRoom,
    isLoading,
    error,
    nickname, // Now we get the current user's nickname directly from the context
    isPendingApproval,
    pendingRoomInfo,
    mintingStatus,
    mockNfts,
    participants,
    setIsCreatingRoom,
    handleCreateRoom,
    handleJoinPending,
    handleJoinRoom,
    cancelPendingRequest,
    goBack,
    handleNftGenerated,
    toggleRoomAction,
  } = useChatRoom();

  const { connected } = useWallet();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const { isRegistered } = useGhostId();

  const renderLoadingState = () => (
    <div className="p-6 text-center bg-black border border-[#222222] rounded-md">
      <div className="mb-6">
        <div className="h-16 w-16 mx-auto rounded-full border border-[#FF4D00] flex items-center justify-center">
          <Loader2 size={24} className="text-[#FF4D00] animate-spin" />
        </div>
      </div>
      <h3 className="text-lg font-medium mb-3">Creating Your Chat Room</h3>
      <p className="mb-2 text-gray-400 max-w-md mx-auto">{mintingStatus || "Processing your request..."}</p>
      <div className="w-full max-w-xs mx-auto bg-[#111111] rounded-full h-1.5 mt-3 mb-4">
        <div className="bg-[#FF4D00] h-1.5 rounded-full animate-pulse"></div>
      </div>
      <p className="text-xs text-gray-500">This may take a moment. Please don't close this window.</p>
    </div>
  );
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center">
      {roomCreated && roomData ? (
        <ChatLayout
          roomData={roomData}
          nickname={nickname} // Use the nickname state from the context directly
          pendingParticipants={roomData.pendingParticipants || []}
          participants={participants}
          isCreator={roomData.isCreator || false}
          mockNfts={mockNfts}
          onNftGenerated={handleNftGenerated}
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
          ) : isLoading && mintingStatus ? (
            <div className="relative">
              <button onClick={goBack} className="absolute top-3 left-3 p-2 text-gray-400 hover:text-[#FF4D00] transition-colors z-10">
                <ArrowLeft size={18} />
              </button>
              {renderLoadingState()}
            </div>
          ) : (
            <div className="bg-black border border-[#222222] rounded-md relative">
              <button onClick={goBack} className="absolute top-3 left-3 p-2 text-gray-400 hover:text-[#FF4D00] transition-colors z-10">
                <ArrowLeft size={18} />
              </button>
              <div className="text-center p-4 pt-10 pb-2">
                <h2 className="text-xl font-bold mb-1">Next level of <span className="text-[#FF4D00]">crypto</span> chat</h2>
                <p className="text-gray-400 text-xs max-w-lg mx-auto">
                  {isCreatingRoom ? "Create a new anonymous chat room with end-to-end encryption" : "Join an existing chat room with your anonymous identity"}
                </p>
              </div>
              <div className="p-4">
                {!connected && (
                  <div className="mb-4 text-center">
                    <p className="text-gray-400 mb-4 text-sm max-w-md mx-auto">Connect your Solana wallet to create or join anonymous chat rooms.</p>
                    <div className="flex justify-center">
                      <WalletMultiButton className="!bg-[#FF4D00] !text-black !font-medium !py-2 !px-6 !rounded-md !transition-all !border-none !text-sm" />
                    </div>
                  </div>
                )}
                {connected && isRegistered && (
                  <div>
                    {isCreatingRoom ? (
                      <ChatRoomForm onSubmit={handleCreateRoom} buttonText="Create Room & Mint NFTs" toggleText="Want to join a room instead?" onToggle={toggleRoomAction} isLoading={isLoading} showPrivateOption={true} />
                    ) : (
                      <div className="flex flex-col items-center space-y-4 py-2">
                        <div className="border border-[#222222] p-4 rounded-md w-full">
                          <h3 className="text-base font-medium mb-3 text-center">Join a Chat Room</h3>
                          <p className="text-center text-gray-400 mb-4 text-sm">Enter a room ID to join an existing chat room.</p>
                          <button onClick={() => setIsJoinModalOpen(true)} className="w-full bg-[#FF4D00] text-black font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center">
                            Join Existing Room
                          </button>
                        </div>
                        <button onClick={toggleRoomAction} className="text-[#FF4D00] hover:text-[#FF6B33] py-1 transition-colors flex items-center text-sm">
                          Want to create a room instead?
                        </button>
                      </div>
                    )}
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
          setIsCreatingRoom(false); // Switch to join mode if pending
          handleJoinPending(roomInfo.roomId, nickname, roomInfo.roomName);
          setIsJoinModalOpen(false);
        }}
      />
    </div>
  );
};

export default ChatRoomPage;