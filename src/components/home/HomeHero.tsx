"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Ghost,
  Hash,
  Sparkles,
} from "lucide-react";

interface HomeHeroProps {
  onJoinChat: () => void;
}

const HomeHero: React.FC<HomeHeroProps> = ({ onJoinChat }) => {
  const navigate = useNavigate();
  const { connected } = useWallet();

  const handleCreateChatRoom = () => {
    navigate("/r");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center pt-24 max-[600px]:py-40 max-[600px]:min-h-fit">
      {/* Background circles */}
      <div className="absolute w-[800px] h-[800px] bg-gradient-to-tr from-[#FF4D00] to-transparent blur-2xl rounded-full border border-[#333333] opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-[950px]:hidden"></div>
      <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-[#521a01] to-transparent blur-xl rounded-full border border-[#333333] opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-[950px]:hidden"></div>
      <div className="absolute w-[400px] h-[400px] bg-gradient-to-r from-[#2b0e01] to-transparent blur-lg rounded-full border border-[#333333] opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-[950px]:hidden"></div>

      {/* Stats */}
      <div className="absolute top-1/2 left-[10%] transform -translate-y-1/2 text-left max-[1200px]:left-[15px] max-[600px]:hidden">
        <div className="p-4">
          <h3 className="text-4xl font-bold">1k+</h3>
          <p className="text-gray-400 text-sm mt-1">Awards</p>
          <div className="w-16 h-px bg-[#333333] my-6"></div>
          <h3 className="text-4xl font-bold">221k</h3>
          <p className="text-gray-400 text-sm mt-1">Transactions</p>
        </div>
      </div>

      <div className="absolute top-1/2 right-[10%] transform -translate-y-1/2 text-left max-[1200px]:right-[15px] max-[600px]:hidden">
        <div className="p-4">
          <h3 className="text-4xl font-bold">100%</h3>
          <p className="text-gray-400 text-sm mt-1">Privacy</p>
          <div className="w-16 h-px bg-[#333333] my-6"></div>
          <h3 className="text-4xl font-bold">0</h3>
          <p className="text-gray-400 text-sm mt-1">Data tracked</p>
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center max-[950px]:max-w-[calc(100%-240px)] max-[600px]:max-w-full">
        <div className="inline-block mb-6 px-4 py-2 rounded-full border border-[#333333]">
          <p className="text-sm opacity-70 flex items-center">
            <Sparkles size={14} className="mr-2 text-[#FF4D00]" />
            Privacy-first, wallet-based chat for crypto-native users
          </p>
        </div>

        <h1 className="text-7xl font-medium leading-tight mb-6 tracking-tight max-[950px]:text-4xl ">
          <Ghost className="inline-block text-[#FF4D00]" size={40} />{" "}
          <span className="gradient-text">ANoGhost</span> <br />
          Anonymous <Hash
            className="inline-block text-[#FF4D00]"
            size={40}
          />{" "}
          <span className="gradient-text">Web3</span> messaging
        </h1>

        <p className="text-gray-300 max-w-2xl mx-auto mt-6 text-lg">
          Join anonymously via wallet authentication. Create temporary rooms,
          DAO boards, or NFT-gated spaces. Messages can self-destruct, with zero
          tracking of personal data.
        </p>

        <div className="mt-10 flex justify-center space-x-4">
          {connected ? (
            <>
              <button
                onClick={handleCreateChatRoom}
                className="h-12 px-6 rounded-full text-nowrap bg-[#FF4D00] text-black flex items-center justify-center hover:opacity-90 transition-colors font-medium"
              >
                Create Room <ArrowUpRight size={18} className="ml-2" />
              </button>
              <button
                onClick={onJoinChat}
                className="h-12 px-6 rounded-full text-nowrap border border-[#333333] flex items-center justify-center hover:border-[#FF4D00] hover:text-[#FF4D00] transition-colors font-medium"
              >
                Join Room <ArrowUpRight size={18} className="ml-2" />
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                const walletButton = document.querySelector(
                  ".custom-wallet-button"
                ) as HTMLButtonElement | null;
                if (walletButton) walletButton.click();
              }}
              className="h-12 px-6 rounded-full text-nowrap bg-[#FF4D00] text-black flex items-center justify-center hover:opacity-90 transition-colors font-medium"
            >
              Connect Wallet <ArrowUpRight size={18} className="ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeHero;
