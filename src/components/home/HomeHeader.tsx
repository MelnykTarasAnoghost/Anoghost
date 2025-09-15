"use client";

import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Ghost } from "lucide-react";
import GhostIdDisplay from "../ghost/GhostIdDisplay";
import CustomWalletSelector from "../CustomWalletSelector";
import GhostNestSelector from "../ghost/GhostNestSelector";

const HomeHeader = () => {
  const { connected } = useWallet();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 py-4 px-6 transition-all duration-300 max-[520px]:absolute ${
        isScrolled ? "bg-[#0A0A0A]/90 backdrop-blur-md shadow-md" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center max-[520px]:items-start">
        <div className="flex items-center">
          <div className="border border-[#333333] rounded-full px-6 py-2 flex items-center">
            <Ghost className="mr-2 text-[#FF4D00]" size={16} />
            <span className="text-sm font-medium tracking-wide">AnoGhost</span>
          </div>
        </div>

        <div className="flex gap-2 max-[520px]:flex-col">
          {connected ? <GhostIdDisplay /> : <CustomWalletSelector />}
          <GhostNestSelector />
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
