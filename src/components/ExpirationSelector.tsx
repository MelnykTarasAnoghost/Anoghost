"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { MessageExpiration } from "../types/encryption"
import { Clock, Check } from "lucide-react"

interface ExpirationSelectorProps {
  onSelect: (expiration: MessageExpiration) => void
  currentValue: MessageExpiration
}

const ExpirationSelector: React.FC<ExpirationSelectorProps> = ({ onSelect, currentValue }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Format the expiration time for display
  const formatExpiration = (expiration: MessageExpiration): string => {
    switch (expiration) {
      case MessageExpiration.NEVER:
        return "Never"
      case MessageExpiration.FIVE_MINUTES:
        return "5m"
      case MessageExpiration.ONE_HOUR:
        return "1h"
      case MessageExpiration.ONE_DAY:
        return "24h"
      case MessageExpiration.ONE_WEEK:
        return "1w"
      default:
        return "Custom"
    }
  }

  // Options for the dropdown
  const expirationOptions = [
    { value: MessageExpiration.NEVER, label: "Never" },
    { value: MessageExpiration.FIVE_MINUTES, label: "5 minutes" },
    { value: MessageExpiration.ONE_HOUR, label: "1 hour" },
    { value: MessageExpiration.ONE_DAY, label: "24 hours" },
    { value: MessageExpiration.ONE_WEEK, label: "1 week" },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-[#FF4D00] transition-colors"
      >
        <Clock size={18} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 p-2 bg-[#1a1a1a] rounded-lg border border-[#333333] text-xs w-40 z-10">
          <div className="flex justify-between items-center mb-2 px-2">
            <span className="text-gray-300 font-medium tracking-tight">Message Expires</span>
          </div>
          <div className="space-y-1">
            {expirationOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${
                  currentValue === option.value ? "bg-[#FF4D00]/10 text-[#FF4D00]" : "text-gray-300 hover:bg-[#333333]"
                } font-light`}
              >
                <span>{option.label}</span>
                {currentValue === option.value && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpirationSelector
