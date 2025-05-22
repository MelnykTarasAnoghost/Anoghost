"use client"

import { useState, useRef, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { type WalletName, WalletReadyState } from "@solana/wallet-adapter-base"
import { ChevronDown, Wallet, LogOut, Check, ExternalLink } from "lucide-react"

const CustomWalletSelector = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { wallets, select, disconnect, connecting, connected, wallet: selectedWallet, publicKey } = useWallet()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Filter wallets by ready state
  const readyWallets = wallets.filter((wallet) => wallet.readyState === WalletReadyState.Installed)
  const installableWallets = wallets.filter(
    (wallet) => wallet.readyState === WalletReadyState.Loadable || wallet.readyState === WalletReadyState.NotDetected,
  )

  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // Handle wallet selection
  const handleSelectWallet = (walletName: WalletName) => {
    select(walletName)
    setDropdownOpen(false)
  }

  // Handle wallet disconnect
  const handleDisconnect = () => {
    disconnect()
    setDropdownOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        disabled={connecting}
        className={`border border-[#333333] rounded-full px-4 py-2 flex items-center justify-between min-w-[140px] hover:border-[#FF4D00] transition-colors ${
          connecting ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        <div className="flex items-center">
          <Wallet size={16} className="mr-2 text-[#FF4D00]" />
          <span className="text-sm">
            {connecting
              ? "Connecting..."
              : connected && publicKey
                ? formatWalletAddress(publicKey.toString())
                : "Connect Wallet"}
          </span>
        </div>
        <ChevronDown size={14} className={`ml-2 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#111111] border border-[#333333] rounded-xl shadow-lg overflow-hidden z-50">
          {connected ? (
            <div className="py-1">
              <div className="px-4 py-3 border-b border-[#333333]">
                <p className="text-xs text-gray-400 mb-1">Connected with {selectedWallet?.adapter.name}</p>
                <p className="text-sm font-medium truncate">
                  {publicKey ? formatWalletAddress(publicKey.toString()) : ""}
                </p>
              </div>
              <button
                onClick={handleDisconnect}
                className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
              >
                <LogOut size={14} className="mr-2 text-[#FF4D00]" />
                Disconnect
              </button>
            </div>
          ) : (
            <div className="py-1">
              <div className="px-4 py-2 border-b border-[#333333]">
                <p className="text-xs text-gray-400">Connect a wallet</p>
              </div>

              {readyWallets.length > 0 && (
                <>
                  {readyWallets.map((wallet) => (
                    <button
                      key={wallet.adapter.name}
                      onClick={() => handleSelectWallet(wallet.adapter.name)}
                      className="flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
                    >
                      <div className="flex items-center">
                        {wallet.adapter.icon && (
                          <img
                            src={wallet.adapter.icon || "/placeholder.svg"}
                            alt={`${wallet.adapter.name} icon`}
                            className="w-5 h-5 mr-2 rounded-full"
                          />
                        )}
                        {wallet.adapter.name}
                      </div>
                      {selectedWallet?.adapter.name === wallet.adapter.name && (
                        <Check size={14} className="text-[#FF4D00]" />
                      )}
                    </button>
                  ))}
                </>
              )}

              {installableWallets.length > 0 && (
                <>
                  <div className="px-4 py-2 border-t border-b border-[#333333] mt-1">
                    <p className="text-xs text-gray-400">Install a wallet</p>
                  </div>
                  {installableWallets.map((wallet) => (
                    <a
                      key={wallet.adapter.name}
                      href={wallet.adapter.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#1A1A1A] transition-colors"
                    >
                      <div className="flex items-center">
                        {wallet.adapter.icon && (
                          <img
                            src={wallet.adapter.icon || "/placeholder.svg"}
                            alt={`${wallet.adapter.name} icon`}
                            className="w-5 h-5 mr-2 rounded-full"
                          />
                        )}
                        {wallet.adapter.name}
                      </div>
                      <ExternalLink size={14} className="text-[#FF4D00]" />
                    </a>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomWalletSelector
