"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { requestJoinRoom } from "../services/socket" 
import { Copy, Ghost, Key, X, ArrowRight, Scan, Wallet, Loader2, CheckCircle2, AlertTriangle, Hash, ImageOff } from "lucide-react" 
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import GhostIdInput from "./GhostIdInput" 
import { Umi, publicKey as umiPublicKey } from "@metaplex-foundation/umi"
import { fetchAllDigitalAssetByOwner } from "@metaplex-foundation/mpl-token-metadata"
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults' // Using default Umi bundle

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onJoinSuccess: (roomData: any) => void 
  onJoinPending: (roomInfo: { roomId: string; roomName: string }) => void
}

type JoinMethod = "roomId" | "nftAccess"

interface UserNftInfo {
  nftIdentifier: string; // Mint address
  name?: string;
  imageUrl?: string;
  metadataUri?: string; 
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onJoinSuccess, onJoinPending }) => {
  const [joinMethod, setJoinMethod] = useState<JoinMethod>("roomId")
  const [roomIdInput, setRoomIdInput] = useState("") 
  const [isLoading, setIsLoading] = useState(false) // For joining room (both methods)
  const [error, setError] = useState<string | null>(null)
  
  // For NFT Access method - client-side fetching
  const [clientNfts, setClientNfts] = useState<UserNftInfo[]>([])
  const [isFetchingClientNfts, setIsFetchingClientNfts] = useState(false)
  const [selectedClientNft, setSelectedClientNft] = useState<UserNftInfo | null>(null)
  
  const modalRef = useRef<HTMLDivElement>(null)
  const roomIdInputRef = useRef<HTMLInputElement>(null)
  const { connected, publicKey, wallet, connect: connectWalletAlias } = useWallet() 
  const { connection } = useConnection(); // Get Solana connection object

  const [ghostId, setGhostId] = useState<string>("") 
  const [showGhostIdInput, setShowGhostIdInput] = useState(false) 

  useEffect(() => {
    if (isOpen) {
        setError(null); 
        if (joinMethod === "roomId" && roomIdInputRef.current) {
            setTimeout(() => roomIdInputRef.current?.focus(), 100);
        } else if (joinMethod === "nftAccess") {
            setClientNfts([]);
            setSelectedClientNft(null);
        }
    }
  }, [isOpen, joinMethod])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && !isLoading && !isFetchingClientNfts) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose, isLoading, isFetchingClientNfts])

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading && !isFetchingClientNfts) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener("keydown", handleEscKey)
    return () => document.removeEventListener("keydown", handleEscKey)
  }, [isOpen, onClose, isLoading, isFetchingClientNfts])

  const handleRoomIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomIdInput.trim()) {
      setError("Please enter a room ID")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const roomToJoin = roomIdInput.trim();
      const result = await requestJoinRoom(roomToJoin) 
      if (result.success) {
        if (result.status === "joined" && result.roomData) {
          console.log(result.roomData)
          onJoinSuccess(result.roomData)
        } else if (result.status === "pending" && result.roomData) {
          onJoinPending({ roomId: result.roomData.roomId, roomName: result.roomData.roomName })
        }
        onClose()
      } else {
        setError(result.error || "Failed to join room")
      }
    } catch (err) {
      console.error("Error joining room by ID:", err)
      setError("Failed to join room. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAttemptConnectWallet = async () => {
    if (!wallet) {
        setError("No wallet provider found. Please ensure your wallet is set up or select a wallet.");
        return;
    }
    try {
        if (!wallet.adapter.connected && connectWalletAlias) {
             await connectWalletAlias();
        } else if (!wallet.adapter.connected) {
            setError("Wallet connection function not available.");
        }
    } catch (e) {
        console.error("Failed to connect wallet", e);
        setError("Failed to connect wallet. Please try again.");
    }
  };

  const handleFetchMyNfts = async () => {
    if (!publicKey || !connection) {
      setError("Please connect your wallet first and ensure connection is available.")
      return
    }
    setIsFetchingClientNfts(true)
    setError(null)
    setSelectedClientNft(null)
    setClientNfts([])

    try {
      // Initialize Umi with the wallet adapter's connection
      const umi = createUmi(connection.rpcEndpoint).use({
        install(context) {
          // If you need to sign transactions with Umi later, you'd integrate the wallet adapter here.
          // For read-only like fetchAllDigitalAssetByOwner, just the RPC endpoint is often enough.
          // However, some Umi plugins might expect a signer.
          // For simplicity, this basic Umi setup is for read operations.
        }
      });
      
      const owner = umiPublicKey(publicKey.toString());
      const assets = await fetchAllDigitalAssetByOwner(umi, owner);

      if (assets.length === 0) {
        setError("No NFTs found in your wallet.");
        setIsFetchingClientNfts(false);
        return;
      }

      const fetchedNftsInfo: UserNftInfo[] = [];
      for (const asset of assets) {
        let nftName: string | undefined = asset.metadata.name;
        let imageUrl: string | undefined;
        
        if (asset.metadata.uri && asset.metadata.uri.trim() !== "") {
          try {
            const response = await fetch(asset.metadata.uri);
            if (response.ok) {
              const jsonMetadata = await response.json();
              if (jsonMetadata.name) nftName = jsonMetadata.name;
              if (jsonMetadata.image) imageUrl = jsonMetadata.image;
            }
          } catch (metaError) {
            console.warn(`Failed to fetch/parse metadata from ${asset.metadata.uri} for ${asset.publicKey}:`, metaError);
          }
        }
        fetchedNftsInfo.push({
          nftIdentifier: asset.publicKey.toString(),
          name: nftName || "Unnamed NFT",
          imageUrl: imageUrl,
          metadataUri: asset.metadata.uri,
        });
      }
      setClientNfts(fetchedNftsInfo);
      if (fetchedNftsInfo.length === 0) { // Should be covered by assets.length check, but good fallback
          setError("No suitable NFT access passes found in your wallet after processing.");
      }

    } catch (err) {
      console.error("Error fetching NFTs client-side:", err)
      setError("An error occurred while fetching your NFTs.")
    } finally {
      setIsFetchingClientNfts(false)
    }
  }


  const handleNftSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientNft) {
      setError("Please select an NFT access pass.")
      return
    }
    if (!publicKey) {
      setError("Wallet not connected.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const verifyResponse = await fetch("http://localhost:3001/api/nft/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nftIdentifier: selectedClientNft.nftIdentifier,
          currentUserWalletAddress: publicKey.toString(),
        }),
      })
      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok || verifyData.status !== "success") {
        setError(verifyData.message || verifyData.reason || "NFT verification failed. This NFT may not grant access or is invalid.")
        setIsLoading(false)
        return
      }

      const verifiedRoomId = verifyData.roomId
      if (!verifiedRoomId) {
        setError("Could not retrieve room ID from verified NFT.")
        setIsLoading(false)
        return
      }
      
      const joinResult = await requestJoinRoom(verifiedRoomId)

      if (joinResult.success) {
        if (joinResult.status === "joined" && joinResult.roomData) {
          onJoinSuccess(joinResult.roomData)
        } else if (joinResult.status === "pending" && joinResult.roomData) { 
          onJoinPending({ roomId: joinResult.roomData.roomId, roomName: joinResult.roomData.roomName })
        }
        onClose()
      } else {
        setError(joinResult.error || "Failed to join room with NFT after verification.")
      }
    } catch (err) {
      console.error("Error joining room with NFT:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectClientNft = (nft: UserNftInfo) => {
    setSelectedClientNft(nft.nftIdentifier === selectedClientNft?.nftIdentifier ? null : nft)
    setError(null); 
  }


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="bg-black rounded-2xl w-full max-w-md p-6 border border-[#333333] shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-medium flex items-center tracking-tight">
            <Ghost size={22} className="mr-2.5 text-[#FF4D00]" />
            Join Chat Room
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading || isFetchingClientNfts}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222222] hover:border-[#FF4D00] hover:text-[#FF4D00] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-[#333333] mb-6">
          <button
            onClick={() => { setJoinMethod("roomId"); setError(null); setClientNfts([]); setSelectedClientNft(null); }}
            className={`flex-1 py-2.5 text-sm font-medium relative ${joinMethod === "roomId" ? "text-white" : "text-gray-400 hover:text-gray-300"}`}
          >
            <div className="flex items-center justify-center"><Copy size={15} className="mr-2" />Room ID</div>
            {joinMethod === "roomId" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF4D00]"></div>}
          </button>
          <button
            onClick={() => { setJoinMethod("nftAccess"); setError(null); setClientNfts([]); setSelectedClientNft(null); }}
            className={`flex-1 py-2.5 text-sm font-medium relative ${joinMethod === "nftAccess" ? "text-white" : "text-gray-400 hover:text-gray-300"}`}
          >
            <div className="flex items-center justify-center"><Key size={15} className="mr-2" />NFT Access</div>
            {joinMethod === "nftAccess" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF4D00]"></div>}
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-xl text-[#FF4D00] text-xs flex items-start">
            <AlertTriangle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {joinMethod === "roomId" ? (
          <form onSubmit={handleRoomIdSubmit} className="space-y-5">
            <div>
              <label htmlFor="roomIdInput" className="block text-sm mb-2.5 text-gray-300 flex items-center tracking-tight">
                <Copy size={15} className="mr-1.5 text-[#FF4D00]" /> Room ID <span className="text-[#FF4D00] ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  ref={roomIdInputRef}
                  id="roomIdInput"
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  placeholder="Paste room ID here"
                  className="w-full p-3.5 pl-10 rounded-xl bg-black text-white border border-[#333333] focus:outline-none focus:border-[#FF4D00] transition-colors"
                  disabled={isLoading}
                  required
                />
                <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 ml-1.5">Enter the room ID shared with you</p>
              </div>
            </div>

            {showGhostIdInput && ( 
              <div className="mb-4">
                <label className="block text-sm mb-1.5 text-gray-400">GhostID</label>
                <GhostIdInput value={ghostId} index={0} onChange={setGhostId} onRemove={() => {}} showRemoveButton={false} disabled={isLoading} />
                <p className="text-xs text-gray-500 mt-1.5 ml-1.5">Enter your GhostID to access this private room</p>
              </div>
            )}

            <div className="flex space-x-4 pt-2">
              <button type="button" onClick={onClose} disabled={isLoading} className="flex-1 bg-[#111111] hover:bg-[#222222] text-white font-medium py-3.5 px-4 rounded-xl transition-colors focus:outline-none disabled:opacity-50 border border-[#222222] hover:border-[#333333]">Cancel</button>
              <button type="submit" disabled={isLoading || !roomIdInput.trim()} className="flex-1 bg-[#FF4D00] text-black font-medium py-3.5 px-4 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center">
                {isLoading ? (<><Loader2 size={16} className="mr-2 animate-spin" />Joining...</>) : (<>Join Room <ArrowRight size={16} className="ml-2" /></>)}
              </button>
            </div>
          </form>
        ) : ( 
          <div className="space-y-5">
            {!connected ? (
              <div className="text-center py-6">
                <Wallet size={36} className="mx-auto mb-5 text-[#FF4D00]" />
                <h3 className="text-lg font-medium mb-2.5">Connect Your Wallet</h3>
                <p className="text-sm text-gray-400 mb-5">Connect your wallet to use NFT access.</p>
                <button
                  type="button"
                  className="bg-[#FF4D00] text-black font-medium py-3 px-8 rounded-xl transition-colors hover:opacity-90"
                  onClick={handleAttemptConnectWallet}
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <form onSubmit={handleNftSubmit} className="space-y-5">
                {clientNfts.length === 0 && !isFetchingClientNfts ? (
                  <div className="border border-[#333333] rounded-xl p-5 text-center">
                    <Scan size={36} className="mx-auto mb-4 text-[#FF4D00]" />
                    <h3 className="text-md font-medium mb-2.5">Load Your NFT Access Passes</h3>
                    <p className="text-xs text-gray-400 mb-5">Click the button to find NFT passes in your wallet.</p>
                    <button type="button" onClick={handleFetchMyNfts} disabled={isFetchingClientNfts} className="bg-[#FF4D00] text-black font-medium py-2.5 px-7 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50">
                      {isFetchingClientNfts ? (<><Loader2 size={16} className="mr-2 animate-spin" />Loading NFTs...</>) : "Load My NFTs"}
                    </button>
                  </div>
                ) : isFetchingClientNfts ? (
                  <div className="border border-[#333333] rounded-xl p-7 text-center">
                    <div className="w-16 h-16 mx-auto mb-5 relative">
                      <div className="absolute inset-0 border-2 border-[#FF4D00] rounded-full animate-ping opacity-75"></div>
                      <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-[#FF4D00]" /></div>
                    </div>
                    <h3 className="text-md font-medium mb-2.5">Loading Your NFTs...</h3>
                    <p className="text-xs text-gray-400">Fetching NFT access passes from your wallet.</p>
                  </div>
                ) : ( 
                  <div>
                    <h3 className="text-sm font-medium mb-3.5 flex items-center">
                      <CheckCircle2 size={15} className="mr-2 text-green-500" />
                      Select Your NFT Access Pass
                    </h3>
                    {clientNfts.length > 0 ? (
                        <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 border border-[#333333] rounded-xl p-3">
                        {clientNfts.map((nft) => (
                            <div
                            key={nft.nftIdentifier}
                            onClick={() => handleSelectClientNft(nft)}
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-150 ease-in-out ${
                                selectedClientNft?.nftIdentifier === nft.nftIdentifier
                                ? "bg-[#FF4D00]/20 border border-[#FF4D00]/50 ring-1 ring-[#FF4D00]"
                                : "bg-[#1C1C1C] border border-[#333333] hover:bg-[#2a2a2a] hover:border-[#555555]"
                            }`}
                            >
                            <div className="w-10 h-10 rounded-md overflow-hidden mr-3 flex-shrink-0 bg-[#222]">
                                <img
                                src={nft.imageUrl || `https://placehold.co/60x60/111111/555555?text=${nft.name ? nft.name.charAt(0) : 'N'}`}
                                alt={nft.name || "NFT Image"}
                                className="w-full h-full object-cover"
                                onError={(e) => (e.currentTarget.src = `https://placehold.co/60x60/111111/555555?text=${nft.name ? nft.name.charAt(0) : 'N'}`)}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-gray-100">{nft.name || "Unnamed NFT"}</p>
                                <p className="text-xs text-gray-400 truncate">{nft.nftIdentifier.substring(0,4)}...{nft.nftIdentifier.substring(nft.nftIdentifier.length - 4)}</p>
                            </div>
                            {selectedClientNft?.nftIdentifier === nft.nftIdentifier && (
                                <CheckCircle2 size={18} className="text-[#FF4D00] ml-2.5 flex-shrink-0" />
                            )}
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-4">No NFT access passes found in your wallet. Ensure they are standard NFTs.</p>
                    )}
                  </div>
                )}

                <div className="flex space-x-4 pt-2">
                  <button type="button" onClick={onClose} disabled={isLoading || isFetchingClientNfts} className="flex-1 bg-[#111111] hover:bg-[#222222] text-white font-medium py-3.5 px-4 rounded-xl transition-colors focus:outline-none disabled:opacity-50 border border-[#222222] hover:border-[#333333]">Cancel</button>
                  <button type="submit" disabled={isLoading || isFetchingClientNfts || !selectedClientNft} className="flex-1 bg-[#FF4D00] text-black font-medium py-3.5 px-4 rounded-xl transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center">
                    {isLoading ? (<><Loader2 size={16} className="mr-2 animate-spin" />Verifying & Joining...</>) : (<>Join with NFT <ArrowRight size={16} className="ml-2" /></>)}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default JoinRoomModal