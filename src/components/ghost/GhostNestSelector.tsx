"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Database } from "lucide-react";
import { AVAILABLE_NESTS, useGhostNest } from "../../contexts/GhostNestContext"; // from the context we built earlier

const GhostNestSelector = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { API_URL, setAPI_URL } = useGhostNest();

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

  const handleSelectNest = (url: string) => {
    setAPI_URL(url);
    setDropdownOpen(false);
  };

  // Format display label
  const getSelectedNestName = () => {
    const found = AVAILABLE_NESTS.find((nest) => nest.url === API_URL);
    return found ? found.name : "Select Ghost Nest";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="border border-[#333333] rounded-full px-4 py-2 flex items-center justify-between min-w-[160px] hover:border-[#FF4D00] transition-colors max-[650px]:min-w-[12s0px]"
      >
        <div className="flex items-center">
          <Database size={16} className="mr-2 text-[#FF4D00]" />
          <span className="text-sm">{getSelectedNestName()}</span>
        </div>
        <ChevronDown
          size={14}
          className={`ml-2 transition-transform ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#111111] border border-[#333333] rounded-xl shadow-lg overflow-hidden z-50">
          <div className="py-1">
            <div className="px-4 py-2 border-b border-[#333333]">
              <p className="text-xs text-gray-400">Choose a Ghost Nest</p>
            </div>

            {AVAILABLE_NESTS.map((nest) => (
              <button
                key={nest.url}
                onClick={() => handleSelectNest(nest.url)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="flex items-center">{nest.name}</div>
                {API_URL === nest.url && (
                  <Check size={14} className="text-[#FF4D00]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GhostNestSelector;
