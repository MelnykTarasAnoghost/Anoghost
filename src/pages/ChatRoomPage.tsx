"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useSocket, registerUser, createChatRoom, requestJoinRoom } from "../services/socket"
import { useNavigate, useLocation } from "react-router-dom"
import JoinRoomModal from "../components/JoinRoomModal"
import ChatRoomForm from "../components/ChatRoomForm"
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react"
import ChatLayout from "../components/ChatLayout"

interface MintResponse {
  nfts: Array<{
    mint: string;
    recipient: string;
    roomId: string;
    createdAt: number;
  }>;
}

const mintNftAccessPasses = async (
  roomId: string,
  roomName: string,
  ghostIds: string[]
): Promise<MintResponse["nfts"]> => {
  const res = await fetch(`https://anoghost.onrender.com/api/mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: roomName,
      ghosts: ghostIds,
      roomId,
    }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error ?? `Minting failed with code ${res.status}`);
  }

  const data: MintResponse = await res.json();
  return data.nfts;
};

interface RoomData {
  roomId: string
  roomName: string
  accessToken?: string
  isPrivate?: boolean
  isCreator?: boolean
  participants: Array<{ nickname: string; joinedAt: number }>
  pendingParticipants?: Array<{ id: string; nickname: string; requestedAt: number }>
}

const ChatRoomPage = () => {
  const { connected, publicKey } = useWallet()
  const [roomCreated, setRoomCreated] = useState(false)
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [isCreatingRoom, setIsCreatingRoom] = useState(true)
  const [joinRoomToken, setJoinRoomToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nickname, setNickname] = useState("")
  const [isRegistered, setIsRegistered] = useState(false)
  const [isPendingApproval, setIsPendingApproval] = useState(false)
  const [pendingRoomInfo, setPendingRoomInfo] = useState<{ roomId: string; roomName: string } | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [mockNfts, setMockNfts] = useState<any[]>([])
  const [mintingStatus, setMintingStatus] = useState<string>("")
  const { socket, connect } = useSocket()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  useEffect(() => {
    console.log("[ChatRoomPage] Component mounted. Connecting socket.");
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // MODIFICATION: Assuming connect() is for initial mount.

  const stableRegisterUser = useCallback(registerUser, [registerUser]);

  const internalHandleJoinRoom = useCallback(async (roomId: string, accessToken?: string) => {
    if (!connected || !publicKey) {
      setError("Please connect your wallet first"); setIsLoading(false); return;
    }
    if (!roomId) {
      setError("Please enter a room ID"); setIsLoading(false); return;
    }
    
    let currentNickname = nickname;
    if (!isRegistered) {
        const userNicknameToRegister = nickname || `Anonymous-${Math.floor(Math.random() * 10000)}`;
        console.log("[ChatRoomPage] Attempting to register user before joining:", userNicknameToRegister);
        const registerResult = await stableRegisterUser(publicKey.toString(), userNicknameToRegister);
        if (!registerResult.success) {
            setError(registerResult.error || "Failed to register nickname before joining."); setIsLoading(false); return;
        }
        setIsRegistered(true);
        setNickname(registerResult.nickname || userNicknameToRegister);
        currentNickname = registerResult.nickname || userNicknameToRegister;
        console.log("[ChatRoomPage] User registered successfully before join. Nickname:", currentNickname);
    }

    setIsLoading(true); setError(null);
    console.log(`[ChatRoomPage] internalHandleJoinRoom called for roomId: ${roomId}`);
    try {
      const storedToken = localStorage.getItem(`room_token_${roomId}`)
      const tokenToUse = accessToken || joinRoomToken || storedToken || undefined
      console.log(`[ChatRoomPage] Joining with token: ${tokenToUse ? "Exists" : "None"}`);

      const result = await requestJoinRoom(roomId, tokenToUse)
      console.log("[ChatRoomPage] requestJoinRoom result:", result);

      if (result.success) {
        if (result.status === "joined" && result.roomData) {
          setRoomData(result.roomData); setRoomCreated(true); setIsPendingApproval(false); setPendingRoomInfo(null);
          if (tokenToUse) localStorage.setItem(`room_token_${roomId}`, tokenToUse);
          localStorage.setItem(`room_data_${roomId}`, JSON.stringify(result.roomData));
          localStorage.removeItem("is_pending_approval"); localStorage.removeItem("pending_room_info");
          console.log("[ChatRoomPage] Successfully joined room:", result.roomData.roomName);
        } else if (result.status === "pending" && result.roomData) {
          setIsPendingApproval(true); setPendingRoomInfo({ roomId: result.roomData.roomId, roomName: result.roomData.roomName });
          localStorage.setItem("pending_room_info", JSON.stringify({roomId: result.roomData.roomId, roomName: result.roomData.roomName}));
          localStorage.setItem("is_pending_approval", "true");
          console.log("[ChatRoomPage] Join request pending for room:", result.roomData.roomName);
        }
      } else {
        setError(result.error || "Failed to join room"); console.error("[ChatRoomPage] Failed to join room:", result.error);
      }
    } catch (err) {
      console.error("[ChatRoomPage] Error in internalHandleJoinRoom:", err); setError("Failed to join room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, isRegistered, nickname, joinRoomToken, stableRegisterUser]);


  useEffect(() => {
    if (location.state) {
      console.log("[ChatRoomPage] Handling location state:", location.state);
      const { roomData: navRoomData, isPendingApproval: isPending, pendingRoomInfo: pendingInfo } = location.state as any;
      if (navRoomData) {
        setRoomData(navRoomData); setRoomCreated(true);
        localStorage.setItem(`room_data_${navRoomData.roomId}`, JSON.stringify(navRoomData));
      }
      if (isPending && pendingInfo) {
        setIsPendingApproval(true); setPendingRoomInfo(pendingInfo);
        localStorage.setItem("pending_room_info", JSON.stringify(pendingInfo));
        localStorage.setItem("is_pending_approval", "true");
      }
    }
  }, [location.state]);

  useEffect(() => {
    console.log(`[ChatRoomPage] Restore effect. isRegistered: ${isRegistered}, roomCreated: ${roomCreated}, isPendingApproval: ${isPendingApproval}`);
    if (isRegistered && !roomCreated && !isPendingApproval) {
      const storedRoomIds = Object.keys(localStorage).filter((key) => key.startsWith("room_token_")).map((key) => key.replace("room_token_", ""));
      if (storedRoomIds.length > 0) {
        console.log("[ChatRoomPage] Found stored room tokens:", storedRoomIds);
        for (const roomId of storedRoomIds) {
          const storedRoomDataStr = localStorage.getItem(`room_data_${roomId}`);
          if (storedRoomDataStr) {
            try {
              const parsedRoomData = JSON.parse(storedRoomDataStr);
              console.log("[ChatRoomPage] Attempting to rejoin stored room:", parsedRoomData.roomName);
              const accessToken = localStorage.getItem(`room_token_${roomId}`);
              if (accessToken) {
                internalHandleJoinRoom(roomId, accessToken); return;
              }
            } catch (e) { console.error("[ChatRoomPage] Error parsing stored room data for rejoin:", e); }
          }
        }
      }
      const isPendingStr = localStorage.getItem("is_pending_approval");
      const pendingInfoStr = localStorage.getItem("pending_room_info");
      if (isPendingStr === "true" && pendingInfoStr) {
        try {
          const pendingInfo = JSON.parse(pendingInfoStr);
          setIsPendingApproval(true); setPendingRoomInfo(pendingInfo);
          console.log("[ChatRoomPage] Restored pending room info from localStorage:", pendingInfo);
        } catch (e) { console.error("[ChatRoomPage] Error parsing pending room info from localStorage:", e); }
      }
    }
  }, [isRegistered, roomCreated, isPendingApproval, internalHandleJoinRoom]);

  useEffect(() => {
    const registerUserWithWallet = async () => {
      console.log(`[ChatRoomPage] registerUserWithWallet effect check. connected: ${connected}, pk: ${!!publicKey}, !isRegistered: ${!isRegistered}`);
      if (connected && publicKey && !isRegistered) {
        setIsLoading(true); setError(null);
        console.log("[ChatRoomPage] Attempting to register user on wallet connect.");
        try {
          const defaultNickname = nickname || `Anonymous-${Math.floor(Math.random() * 10000)}`;
          const result = await stableRegisterUser(publicKey.toString(), defaultNickname);
          if (result.success) {
            setIsRegistered(true);
            setNickname(result.nickname || defaultNickname);
            console.log("[ChatRoomPage] User registered on connect. Nickname:", result.nickname || defaultNickname);
          } else {
            setError(result.error || "Failed to register user");
            console.error("[ChatRoomPage] Failed to register user on connect:", result.error);
          }
        } catch (err) {
          setError("Error registering user: " + (err as Error).message);
          console.error("[ChatRoomPage] Error registering user on connect:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    registerUserWithWallet();
  }, [connected, publicKey, nickname, isRegistered, stableRegisterUser]);

  useEffect(() => {
    if (!socket) {
      console.log("[ChatRoomPage] Socket not available for event listeners.");
      return;
    }
    console.log(`[ChatRoomPage] Attaching socket listeners. Current room ID: ${roomData?.roomId}`);

    const handleJoinRequestApproved = (data: {
      roomId: string; roomName: string; accessToken: string;
      participants: Array<{ nickname: string; joinedAt: number }>;
      isCreator?: boolean; pendingParticipants?: Array<{ id: string; nickname: string; requestedAt: number }>;
    }) => {
      console.log("[ChatRoomPage] Event: joinRequestApproved received", data);
      setIsPendingApproval(false); setPendingRoomInfo(null);
      const newRoomData: RoomData = {
        roomId: data.roomId, roomName: data.roomName, accessToken: data.accessToken, participants: data.participants,
        isCreator: data.isCreator !== undefined ? data.isCreator : (roomData?.isCreator || false),
        pendingParticipants: data.pendingParticipants !== undefined ? data.pendingParticipants : (roomData?.pendingParticipants || []),
      };
      setRoomData(newRoomData); setRoomCreated(true);
      if (data.accessToken) localStorage.setItem(`room_token_${data.roomId}`, data.accessToken);
      localStorage.setItem(`room_data_${data.roomId}`, JSON.stringify(newRoomData));
      localStorage.removeItem("pending_room_info"); localStorage.removeItem("is_pending_approval");
    };

    const handleJoinRequestRejected = (data: { roomId: string; roomName: string }) => {
      console.log("[ChatRoomPage] Event: joinRequestRejected received", data);
      setIsPendingApproval(false); setPendingRoomInfo(null);
      setError(`Your request to join "${data.roomName}" was rejected.`);
      localStorage.removeItem("pending_room_info"); localStorage.removeItem("is_pending_approval");
    };

    const handlePendingJoinRequest = (data: { roomId: string; pendingParticipants: Array<{ id: string; nickname: string; requestedAt: number }> }) => {
      console.log("[ChatRoomPage] Event: pendingJoinRequest received", data);
      setRoomData(prev => prev && prev.roomId === data.roomId ? { ...prev, pendingParticipants: data.pendingParticipants } : prev);
    };

    const handleRoomCreatorChanged = (data: { roomId: string; isCreator: boolean; pendingParticipants: Array<{ id: string; nickname: string; requestedAt: number }> }) => {
      console.log("[ChatRoomPage] Event: roomCreatorChanged received", data);
      setRoomData(prev => prev && prev.roomId === data.roomId ? { ...prev, isCreator: data.isCreator, pendingParticipants: data.pendingParticipants } : prev);
    };
    const handleUserJoinedOrLeft_Debug = (eventData: { roomId: string; participants: Array<{ nickname: string; joinedAt: number }> }, eventName: string) => {
        console.log(`[OLD_USER_DEBUG] Event: ${eventName} received by ChatRoomPage.`);
        console.log(`[OLD_USER_DEBUG] Event Data:`, JSON.parse(JSON.stringify(eventData))); // Critical log
        setRoomData(prevRoomData => {
          console.log(`[OLD_USER_DEBUG] setRoomData callback triggered for ${eventName}.`);
          console.log(`[OLD_USER_DEBUG] Current (prev) room ID in state: ${prevRoomData?.roomId}`);
          console.log(`[OLD_USER_DEBUG] Event's target room ID: ${eventData.roomId}`);
          console.log(`[OLD_USER_DEBUG] Current (prev) participants count: ${prevRoomData?.participants?.length}`);
          console.log(`[OLD_USER_DEBUG] Event participants count: ${eventData.participants?.length}`); // Critical log
          if (prevRoomData && prevRoomData.roomId === eventData.roomId) {
            // This comparison might be too strict if object references are the same but content should force an update
            // However, if a new user joins, the content (and thus stringified version) SHOULD differ.
          if (JSON.stringify(prevRoomData.participants) === JSON.stringify(eventData.participants)) {
              console.log("[OLD_USER_DEBUG] Participants list from event is identical to current. No state change needed.");
              return prevRoomData;
            }
            console.log("[OLD_USER_DEBUG] Room IDs match and participants differ. Updating participants list.");
            const updatedRoomData = { ...prevRoomData, participants: eventData.participants };
            localStorage.setItem(`room_data_${eventData.roomId}`, JSON.stringify(updatedRoomData));
            console.log("[OLD_USER_DEBUG] New participants list set in state:", JSON.parse(JSON.stringify(updatedRoomData.participants))); // Critical log
            return updatedRoomData;
          } else {
            console.log("[OLD_USER_DEBUG] Condition for update NOT MET (Room ID mismatch or no previous room data). Not updating state for this event.");
            return prevRoomData;
          }
        });
      };
    
    const onUserJoined = (data: any) => handleUserJoinedOrLeft_Debug(data, "userJoinedRoom");
    const onUserLeft = (data: any) => handleUserJoinedOrLeft_Debug(data, "userLeftRoom");

    socket.on("userJoinedRoom", onUserJoined); socket.on("userLeftRoom", onUserLeft);
    socket.on("joinRequestApproved", handleJoinRequestApproved); socket.on("joinRequestRejected", handleJoinRequestRejected);
    socket.on("pendingJoinRequest", handlePendingJoinRequest); socket.on("roomCreatorChanged", handleRoomCreatorChanged);

    return () => {
      console.log(`[ChatRoomPage] Cleaning up socket listeners. Current room ID: ${roomData?.roomId}`);
      socket.off("userJoinedRoom", onUserJoined); socket.off("userLeftRoom", onUserLeft);
      socket.off("joinRequestApproved", handleJoinRequestApproved); socket.off("joinRequestRejected", handleJoinRequestRejected);
      socket.off("pendingJoinRequest", handlePendingJoinRequest); socket.off("roomCreatorChanged", handleRoomCreatorChanged);
    };
  }, [socket, roomData?.roomId, roomData?.isCreator, roomData?.pendingParticipants]); // Restored some deps to be safer for re-binding if these aspects of roomData change

  const handleCreateRoom = async (formData: { roomName: string; nickname: string; isPrivate: boolean; ghostIds: string[] }) => {
    if (!connected || !publicKey) { setError("Please connect your wallet first"); return; }
    if (!formData.nickname) { setError("Please enter a nickname"); return; }
    console.log("[ChatRoomPage] handleCreateRoom called with formData:", formData);
    setIsLoading(true); setError(null); setMintingStatus("Registering user...");
    try {
      if (formData.nickname !== nickname || !isRegistered) {
        console.log("[ChatRoomPage] Registering/updating nickname for room creation.");
        const registerResult = await stableRegisterUser(publicKey.toString(), formData.nickname);
        if (!registerResult.success) {
          setError(registerResult.error || "Failed to update/register nickname"); setIsLoading(false); return;
        }
        setNickname(registerResult.nickname || formData.nickname); setIsRegistered(true);
        console.log("[ChatRoomPage] Nickname registered/updated. New nickname:", registerResult.nickname || formData.nickname);
      }
      setMintingStatus("Creating encrypted chat room...");
      const result = await createChatRoom(formData.roomName, formData.isPrivate);
      console.log("[ChatRoomPage] createChatRoom result:", result);
      if (result.success && result.roomData) {
        if (result.roomData.accessToken) localStorage.setItem(`room_token_${result.roomData.roomId}`, result.roomData.accessToken);
        if (formData.ghostIds && formData.ghostIds.length > 0) {
          setMintingStatus(`Minting ${formData.ghostIds.length} NFT access passes...`);
          try {
            const mintedNfts = await mintNftAccessPasses(result.roomData.roomId, formData.roomName, formData.ghostIds);
            setMockNfts(mintedNfts); setMintingStatus("NFT access passes created successfully!");
            console.log("[ChatRoomPage] NFTs minted:", mintedNfts);
          } catch (mintError) {
            console.error("[ChatRoomPage] Error minting NFTs:", mintError); setError("Room created, but failed to mint NFT access passes.");
          }
        }
        setRoomData(result.roomData); setRoomCreated(true);
        localStorage.setItem(`room_data_${result.roomData.roomId}`, JSON.stringify(result.roomData));
        console.log("[ChatRoomPage] Room created successfully:", result.roomData.roomName);
      } else {
        setError(result.error || "Failed to create room"); console.error("[ChatRoomPage] Failed to create room:", result.error);
      }
    } catch (err) {
      console.error("[ChatRoomPage] Error in handleCreateRoom:", err); setError("Failed to create room. Please try again.");
    } finally {
      setIsLoading(false); setMintingStatus("");
    }
  };

  const toggleRoomAction = () => { setIsCreatingRoom(!isCreatingRoom); setError(null); };
  const cancelPendingRequest = () => {
    setIsPendingApproval(false); setPendingRoomInfo(null);
    localStorage.removeItem("is_pending_approval"); localStorage.removeItem("pending_room_info");
    console.log("[ChatRoomPage] Cancelled pending join request.");
  };
  const handleNftGenerated = (nft: any) => { setMockNfts((prev) => [...prev, nft]); console.log("[ChatRoomPage] NFT generated (mock):", nft);};
  const goBack = () => navigate("/");

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
          nickname={nickname}
          pendingParticipants={roomData.pendingParticipants || []}
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
                {connected && (
                  <div>
                    {isCreatingRoom ? (
                      <ChatRoomForm onSubmit={handleCreateRoom} buttonText="Create Room & Mint NFTs" toggleText="Want to join a room instead?" onToggle={toggleRoomAction} isLoading={isLoading} initialNickname={nickname} showPrivateOption={true} />
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
        onJoinSuccess={(joinedRoomData) => {
          console.log("[ChatRoomPage] JoinRoomModal onJoinSuccess", joinedRoomData);
          setRoomData(joinedRoomData);
          setRoomCreated(true);
          setIsPendingApproval(false);
          setPendingRoomInfo(null);
          if (joinedRoomData.accessToken) {
            localStorage.setItem(`room_token_${joinedRoomData.roomId}`, joinedRoomData.accessToken);
          }
          localStorage.setItem(`room_data_${joinedRoomData.roomId}`, JSON.stringify(joinedRoomData));
          localStorage.removeItem("is_pending_approval");
          localStorage.removeItem("pending_room_info");
          setIsJoinModalOpen(false);
        }}
        onJoinPending={(roomInfo) => {
          console.log("[ChatRoomPage] JoinRoomModal onJoinPending", roomInfo);
          setIsPendingApproval(true);
          setPendingRoomInfo(roomInfo);
          localStorage.setItem("pending_room_info", JSON.stringify(roomInfo));
          localStorage.setItem("is_pending_approval", "true");
          setIsJoinModalOpen(false);
        }}
      />
    </div>
  )
}

export default ChatRoomPage