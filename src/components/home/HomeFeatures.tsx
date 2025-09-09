"use client";

import React from "react";
import { Lock, Shield, Hash } from "lucide-react";

const HomeFeatures = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 pb-32 max-[750px]:pb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-[#333333] rounded-xl p-6 hover:border-[#FF4D00] transition-colors">
          <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center mb-4 border border-[#222222]">
            <Lock size={24} className="text-[#FF4D00]" />
          </div>
          <h3 className="text-xl font-medium mb-2 tracking-tight hover:text-[#FF4D00] transition-colors">
            Privacy-First
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            No emails, phone numbers, or IP tracking. Just connect your wallet
            and start chatting anonymously.
          </p>
        </div>

        <div className="border border-[#333333] rounded-xl p-6 hover:border-[#FF4D00] transition-colors">
          <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center mb-4 border border-[#222222]">
            <Shield size={24} className="text-[#FF4D00]" />
          </div>
          <h3 className="text-xl font-medium mb-2 tracking-tight hover:text-[#FF4D00] transition-colors">
            Self-Destructing
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Set messages to automatically delete after a specified time. Perfect
            for sharing sensitive information.
          </p>
        </div>

        <div className="border border-[#333333] rounded-xl p-6 hover:border-[#FF4D00] transition-colors">
          <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center mb-4 border border-[#222222]">
            <Hash size={24} className="text-[#FF4D00]" />
          </div>
          <h3 className="text-xl font-medium mb-2 tracking-tight hover:text-[#FF4D00] transition-colors">
            NFT-Gated Rooms
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Create exclusive spaces for NFT holders or token owners. Perfect for
            DAOs and exclusive communities.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeFeatures;
