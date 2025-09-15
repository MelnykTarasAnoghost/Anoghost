"use client";

import type React from "react";
import { useState } from "react";
import {
  X,
  UserPlus,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  Loader2,
  LogOut,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Users,
  Globe,
  LockKeyhole,
} from "lucide-react";
import PendingRequests from "./PendingRequests";
import GhostIdInput from "../ghost/GhostIdInput";
import { leaveRoom } from "@/services/socket";
import ParticipantsList from "./ParticipantsList"; // Import the ParticipantsList component
import { useLastWall } from "@/contexts/LastWallContext";

interface RoomData {
  roomId: string;
  roomName: string;
  accessToken?: string;
  isPrivate?: boolean;
}

interface RightSidebarProps {
  roomData: RoomData;
  participants: Array<{ nickname: string; joinedAt: number }>;
  pendingParticipants: Array<{
    id: string;
    nickname: string;
    requestedAt: number;
  }>;
  isCreator: boolean;
  onClose: () => void;
  onNftGenerated: (nft: any) => void;
  onLeaveRoom: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  roomData,
  participants,
  pendingParticipants,
  isCreator,
  onClose,
  onLeaveRoom,
}) => {
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [ghostIds, setGhostIds] = useState<string[]>([""]);
  const [currentStep, setCurrentStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { wallKey, setWallKey } = useLastWall(roomData.roomId);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const BASE_PRICE = 0.01; // SOL
  const PRICE_PER_NFT = 0.005; // SOL

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomData.roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLeaveRoom = async () => {
    const confirmation = window.confirm(
      "Are you sure you want to leave this room?"
    );
    if (!confirmation) return;

    try {
      const result = await leaveRoom(roomData.roomId);
      if (result.success) {
        console.log("Successfully left the room.");
        onLeaveRoom();
      } else {
        console.error("Failed to leave room:", result.error);
      }
    } catch (error) {
      console.error("Error while leaving:", error);
      window.location.href = "/";
    }
  };

  const handleAddParticipant = () => {
    if (roomData.isPrivate) {
      setShowAddParticipantModal(true);
    } else {
      handleCopyRoomId();
    }
  };

  const addGhostId = () => {
    setGhostIds([...ghostIds, ""]);
  };

  const removeGhostId = (index: number) => {
    const newIds = [...ghostIds];
    newIds.splice(index, 1);
    if (newIds.length === 0) {
      newIds.push("");
    }
    setGhostIds(newIds);

    if (errors[`ghost_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`ghost_${index}`];
      setErrors(newErrors);
    }
  };

  const updateGhostId = (index: number, value: string) => {
    const newIds = [...ghostIds];
    newIds[index] = value;
    setGhostIds(newIds);

    if (errors[`ghost_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`ghost_${index}`];
      setErrors(newErrors);
    }
  };

  const validateGhostIds = () => {
    const newErrors: { [key: string]: string } = {};
    const validGhostIds = ghostIds.filter((id) => id.trim() !== "");

    if (validGhostIds.length === 0) {
      newErrors.ghostIds = "At least one GhostID is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateGhostIds()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateGhostIds()) return;

    setIsProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setShowAddParticipantModal(false);
      setCurrentStep(1);
      setGhostIds([""]);
    } catch (error) {
      console.error("Error processing GhostIDs:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotalPrice = () => {
    const validGhostIds = ghostIds.filter((id) => id.trim() !== "");
    return BASE_PRICE + validGhostIds.length * PRICE_PER_NFT;
  };

  const handleActivateWallKey = async () => {
    if (!inputValue.trim()) {
      setKeyError("Please enter an encryption key");
      return;
    }

    if (inputValue.length < 8) {
      setKeyError("Key must be at least 8 characters long");
      return;
    }

    setIsActivating(true);
    setKeyError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setWallKey(inputValue);
      setShowSuccess(true);

      setTimeout(() => {
        setIsPopupOpen(false);
        setInputValue("");
        setShowSuccess(false);
        setShowKey(false);
      }, 1500);
    } catch (error) {
      setKeyError("Failed to activate encryption key");
    } finally {
      setIsActivating(false);
    }
  };

  const handleCloseModal = () => {
    setIsPopupOpen(false);
    setInputValue("");
    setKeyError("");
    setShowSuccess(false);
    setShowKey(false);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0a] to-[#000000] border-l border-[#1a1a1a]">
      <div className="p-4 border-b border-[#1a1a1a] bg-gradient-to-r from-[#111111] to-[#0f0f0f]">
        <div className="flex justify-between items-start mb-2">
          {/* <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4D00] to-[#FF6B33] flex items-center justify-center">
              <Users size={16} className="text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-white text-lg tracking-tight truncate">{roomData.roomName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    roomData.isPrivate
                      ? "bg-yellow-500/40 text-white border border-yellow-500/60"
                      : "bg-green-500/40 text-white border border-green-500/60"
                  }`}
                >
                  {roomData.isPrivate ? <LockKeyhole size={10} /> : <Globe size={10} />}
                  {roomData.isPrivate ? "Private" : "Public"}
                </div>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">{participants.length} members</span>
              </div>
            </div>
          </div> */}
          <button
            onClick={onClose}
            className="min-[920px]:hidden w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between p-2 bg-[#0f0f0f] rounded-xl border border-[#2a2a2a]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Key size={12} className="text-[#FF4D00] flex-shrink-0 ml-1" />
            <span className="text-xs text-gray-400 font-mono truncate">
              {roomData.roomId}
            </span>
          </div>
          <button
            onClick={handleCopyRoomId}
            className="w-6 h-6 rounded-xl flex items-center justify-center text-[#FF4D00] hover:bg-[#FF4D00]/20 transition-all duration-200 flex-shrink-0"
            title="Copy room ID"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isCreator && pendingParticipants.length > 0 && (
          <PendingRequests
            roomId={roomData.roomId}
            pendingParticipants={pendingParticipants}
          />
        )}

        <div className="bg-gradient-to-r from-[#111111]/50 to-[#1a1a1a]/50 rounded-xl border border-[#2a2a2a] backdrop-blur-sm overflow-hidden">
          <div className="p-3 bg-gradient-to-r from-[#1a1a1a] to-[#222222] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[#FF4D00]" />
              <h3 className="text-sm font-semibold text-white">Participants</h3>
              <div className="bg-[#FF4D00] text-black text-xs font-bold py-0.5 px-1.5 rounded-full">
                {participants.length}
              </div>
            </div>
            {isCreator && (
              <button
                onClick={handleAddParticipant}
                className="w-7 h-7 rounded-lg bg-[#FF4D00]/20 hover:bg-[#FF4D00]/30 text-[#FF4D00] hover:text-[#FF6B33] transition-all duration-200 flex items-center justify-center group"
                title={roomData.isPrivate ? "Add participants" : "Copy room ID"}
              >
                {roomData.isPrivate ? (
                  <UserPlus size={14} className="transition-transform" />
                ) : (
                  <Plus size={14} className="transition-transform" />
                )}
              </button>
            )}
          </div>
          <div className="p-3">
            <ParticipantsList participants={participants} />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#1a1a1a] bg-gradient-to-r from-[#0f0f0f] to-[#111111] space-y-3">
        <button
          onClick={() => setIsPopupOpen(true)}
          className="w-full bg-gradient-to-r from-[#FF4D00] to-[#FF6B33] hover:from-[#FF6B33] hover:to-[#FF4D00] text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform group"
        >
          <Shield size={14} />
          <span className="text-sm">Last Wall</span>
          {wallKey && (
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          )}
        </button>

        <button
          onClick={handleLeaveRoom}
          className="w-full bg-transparent border border-red-500/30 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 group"
        >
          <LogOut size={14} className="transition-transform" />
          <span className="text-sm">Exit Room</span>
        </button>
      </div>

      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] rounded-2xl w-full max-w-md border border-[#2a2a2a] shadow-2xl animate-slide-in-up">
            <div className="p-6 border-b border-[#1a1a1a] bg-gradient-to-r from-[#111111] to-[#0f0f0f]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF4D00] to-[#FF6B33] flex items-center justify-center">
                    <UserPlus size={20} className="text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white tracking-tight">
                      Add Participants
                    </h2>
                    <p className="text-sm text-gray-400">
                      Invite users to join
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddParticipantModal(false);
                    setCurrentStep(1);
                    setGhostIds([""]);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all duration-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {roomData.isPrivate ? (
                <div>
                  {currentStep === 1 ? (
                    <div className="space-y-4">
                      <p className="text-gray-300 mb-3">
                        Add GhostIDs to grant access to this private room. Each
                        GhostID will receive an NFT access pass.
                      </p>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm text-gray-400">
                            GhostIDs for NFT Access
                          </label>
                          <button
                            type="button"
                            onClick={addGhostId}
                            className="text-xs flex items-center text-[#FF4D00] hover:text-[#FF6B33]"
                          >
                            <Plus size={12} className="mr-1" />
                            Add GhostID
                          </button>
                        </div>
                        {errors.ghostIds && (
                          <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <p className="text-xs text-red-500">
                              {errors.ghostIds}
                            </p>
                          </div>
                        )}
                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 border border-[#222222] rounded-xl p-3">
                          {ghostIds.map((id, index) => (
                            <GhostIdInput
                              key={index}
                              value={id}
                              index={index}
                              onChange={(value) => updateGhostId(index, value)}
                              onRemove={() => removeGhostId(index)}
                              showRemoveButton={ghostIds.length > 1}
                              disabled={isProcessing}
                              error={errors[`ghost_${index}`]}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Each GhostID will receive an NFT access pass to this
                          chat room
                        </p>
                      </div>
                      <div className="flex justify-end mt-5">
                        <button
                          onClick={handleNext}
                          className="bg-[#FF4D00] text-black font-medium py-2.5 px-5 rounded-xl transition-colors flex items-center justify-center hover:opacity-90"
                        >
                          Next
                          <ArrowRight size={16} className="ml-2" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border border-[#222222] rounded-xl p-4 mb-3">
                        <h3 className="text-sm font-medium mb-3">
                          Fee Summary
                        </h3>
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">
                              Room Type:
                            </span>
                            <span className="text-xs font-medium">Private</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">
                              NFT Access Passes:
                            </span>
                            <span className="text-xs font-medium">
                              {ghostIds.filter((id) => id.trim() !== "").length}
                            </span>
                          </div>
                        </div>
                        {ghostIds.filter((id) => id.trim() !== "").length >
                          0 && (
                          <div className="border-t border-[#222222] pt-3 mb-3">
                            <h4 className="text-xs font-medium mb-2">
                              GhostID Recipients:
                            </h4>
                            <div className="max-h-[80px] overflow-y-auto border border-[#222222] rounded-xl p-2">
                              {ghostIds
                                .filter((id) => id.trim() !== "")
                                .map((id, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center mb-1.5"
                                  >
                                    <Check
                                      size={10}
                                      className="text-green-500 mr-1.5 flex-shrink-0"
                                    />
                                    <span className="text-xs font-mono truncate">
                                      {id}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        <div className="border-t border-[#222222] pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">
                              Base Price:
                            </span>
                            <span className="text-xs font-medium">
                              {BASE_PRICE} SOL
                            </span>
                          </div>
                          {ghostIds.filter((id) => id.trim() !== "").length >
                            0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-400">
                                NFT Access Passes (
                                {
                                  ghostIds.filter((id) => id.trim() !== "")
                                    .length
                                }
                                × {PRICE_PER_NFT}
                                SOL):
                              </span>
                              <span className="text-xs font-medium">
                                {(
                                  ghostIds.filter((id) => id.trim() !== "")
                                    .length * PRICE_PER_NFT
                                ).toFixed(3)}{" "}
                                SOL
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#222222]">
                            <span className="text-xs font-medium">Total:</span>
                            <span className="text-xs font-bold text-[#FF4D00]">
                              {calculateTotalPrice().toFixed(3)} SOL
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleBack}
                          className="flex-1 bg-[#222222] text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center"
                          disabled={isProcessing}
                        >
                          <ArrowLeft size={14} className="mr-1.5" />
                          Back
                        </button>
                        <button
                          onClick={handleSubmit}
                          className="flex-1 bg-[#FF4D00] text-black font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center hover:opacity-90 disabled:opacity-50"
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2
                                size={14}
                                className="mr-1.5 animate-spin"
                              />
                              Processing...
                            </>
                          ) : (
                            "Mint & Send NFTs"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF4D00]/20 to-[#FF6B33]/20 flex items-center justify-center mx-auto mb-4">
                      <Users size={24} className="text-[#FF4D00]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Public Room
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Share the Room ID with others to let them join this
                      conversation.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-[#111111] to-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                    <div className="flex items-center gap-2 mb-3">
                      <Key size={16} className="text-[#FF4D00] flex-shrink-0" />
                      <p className="text-sm font-medium text-white">Room ID</p>
                    </div>
                    <div className="flex items-center bg-[#0a0a0a] rounded-lg border border-[#333333] overflow-hidden">
                      <div className="flex-1 p-3">
                        <p className="text-sm font-mono text-gray-300">
                          {roomData.roomId}
                        </p>
                      </div>
                      <button
                        onClick={handleCopyRoomId}
                        className="bg-[#FF4D00] hover:bg-[#FF6B33] text-black p-3 transition-all duration-200 flex items-center justify-center min-w-[48px]"
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                      Anyone with this Room ID can request to join this chat
                      room. Share it securely.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowAddParticipantModal(false)}
                      className="bg-gradient-to-r from-[#FF4D00] to-[#FF6B33] hover:from-[#FF6B33] hover:to-[#FF4D00] text-black font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Last Wall Modal remains the same as it's already well-styled */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl animate-slide-in-up">
            {/* Enhanced header with gradient and icon */}
            <div className="p-6 border-b border-[#1a1a1a]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF4D00] to-[#FF6B33] flex items-center justify-center">
                    <Lock size={20} className="text-black" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-xl tracking-tight">
                      Last Wall
                    </h3>
                    <p className="text-gray-400 text-sm">
                      End-to-end encryption
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all duration-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Enhanced content area */}
            <div className="p-6 space-y-6">
              {/* Status indicator */}
              {wallKey && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check size={16} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-green-400 font-medium text-sm">
                      Encryption Active
                    </p>
                    <p className="text-green-400/70 text-xs">
                      Your messages are protected
                    </p>
                  </div>
                </div>
              )}

              {/* Enhanced description */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF4D00]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Key size={12} className="text-[#FF4D00]" />
                  </div>
                  <div>
                    <p className="text-gray-300 text-sm font-medium mb-1">
                      Layer of Client-Side Encryption
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Add an extra layer of client-side encryption on top of
                      ours to ensure your messages are only readable by the
                      intended recipient.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF4D00]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield size={12} className="text-[#FF4D00]" />
                  </div>
                  <div>
                    <p className="text-gray-300 text-sm font-medium mb-1">
                      Secure Communication
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Only users with the same key can decrypt and read
                      messages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced input section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Encryption Key
                </label>

                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (keyError) setKeyError("");
                    }}
                    placeholder="Enter your encryption key..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a22] text-white px-4 py-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/50 focus:border-[#FF4D00] transition-all duration-200 placeholder:text-gray-500"
                    disabled={isActivating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    disabled={isActivating}
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {keyError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <X size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-xs">{keyError}</p>
                  </div>
                )}

                <p className="text-gray-500 text-xs">
                  Minimum 8 characters. Keep this key safe and share it securely
                  with other participants.
                </p>
              </div>

              {/* Enhanced action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 bg-[#2a2a2a] hover:bg-[#333333] text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50"
                  disabled={isActivating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleActivateWallKey}
                  className="flex-1 bg-gradient-to-r from-[#FF4D00] to-[#FF6B33] hover:from-[#FF6B33] hover:to-[#FF4D00] text-black font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform"
                  disabled={isActivating || !inputValue.trim()}
                >
                  {isActivating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : showSuccess ? (
                    <>
                      <Check size={16} />
                      <span>Activated!</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Activate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightSidebar;
