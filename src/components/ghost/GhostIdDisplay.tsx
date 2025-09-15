"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AlertCircle,
  RotateCcw,
  Copy,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useGhostId } from "../../contexts/GhostIdContext";

const GhostIdDisplay = () => {
  const { connected, disconnect } = useWallet();
  const {
    formattedGhostId,
    ghostId,
    timeLeft,
    isLoading,
    error,
    copied,
    handleCopy,
    handleRefresh,
    formatTimeLeft,
  } = useGhostId();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDisconnectWallet = () => {
    disconnect();
    setDropdownOpen(false);
  };

  // Use the context functions directly for the dropdown buttons
  const handleDropdownRefresh = () => {
    handleRefresh();
    setDropdownOpen(false);
  };

  const handleDropdownCopy = () => {
    handleCopy();
    setDropdownOpen(false);
  };

  if (!connected) {
    return (
      <span className="text-gray-500 text-xs">Connect wallet to view</span>
    );
  }

  if (error) {
    return (
      <div className="flex items-center text-xs text-amber-500">
        <AlertCircle size={12} className="mr-1" />
        <span>{error}</span>
      </div>
    );
  }

  if (isLoading || !formattedGhostId) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-[#222222] h-4 w-32 rounded"></div>
      </div>
    );
  }

  // Main UI with the dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="border border-[#333333] rounded-full px-4 py-2 flex items-center hover:border-[#FF4D00] transition-colors"
      >
        <div className="flex items-center">
          <span className="text-xs text-gray-400 mr-2">Ghost ID:</span>
          <span className="font-mono text-sm text-[#FF4D00] max-[650px]:hidden">
            {formattedGhostId}
          </span>
          <span className="text-xs text-gray-500 ml-2">{formatTimeLeft()}</span>
        </div>
        <ChevronDown
          size={14}
          className={`ml-2 transition-transform ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#111111] border border-[#333333] rounded-xl shadow-lg overflow-hidden z-50">
          <div className="py-1">
            <button
              onClick={handleDropdownRefresh}
              className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
            >
              <RotateCcw size={14} className="mr-2 text-[#FF4D00]" />
              Refresh Ghost ID
            </button>
            <button
              onClick={handleDropdownCopy}
              className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
            >
              <Copy size={14} className="mr-2 text-[#FF4D00]" />
              Copy Ghost ID
              {copied && <span className="ml-2 text-green-500">(Copied!)</span>}
            </button>
            <div className="border-t border-[#333333] my-1"></div>
            <button
              onClick={handleDisconnectWallet}
              className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
            >
              <LogOut size={14} className="mr-2 text-[#FF4D00]" />
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GhostIdDisplay;
