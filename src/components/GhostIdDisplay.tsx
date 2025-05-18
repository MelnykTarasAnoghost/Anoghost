"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { AlertCircle } from "lucide-react"
import { getSocket, initializeSocket, useSocket, registerUser } from "../services/socket"

interface GhostIdDisplayProps {
  showControls?: boolean
  onRefresh?: () => void
  onCopy?: () => void
}

const GhostIdDisplay: React.FC<GhostIdDisplayProps> = ({ showControls = false, onRefresh, onCopy }) => {
  const { connected, publicKey } = useWallet()
  const { socket, isConnected } = useSocket() // Use the socket hook to track connection state
  const [ghostId, setGhostId] = useState<string>("")
  const [formattedGhostId, setFormattedGhostId] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(300) // Start with 5 minutes
  const [isLoading, setIsLoading] = useState(false)
  const [lastRequestTime, setLastRequestTime] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRegistered, setIsRegistered] = useState(false)

  // Use refs to track operation in progress to prevent infinite loops
  const registrationInProgress = useRef(false)
  const ghostIdRequestInProgress = useRef(false)
  const walletAddress = useRef<string | null>(null)

  // Format Ghost ID for display (truncates and adds separators)
  const formatGhostId = (id: string): string => {
    if (!id || id.length < 12) return id
    const prefix = id.substring(0, 12)
    return `${prefix.substring(0, 4)}-${prefix.substring(4, 8)}-${prefix.substring(8, 12)}`
  }

  // Register user with the server
  const registerWithServer = useCallback(async () => {
    // Prevent multiple simultaneous registrations
    if (registrationInProgress.current) {
      console.log("[GhostID Client] Registration already in progress, skipping")
      return false
    }

    if (!connected || !publicKey || !isConnected) return false

    // Check if we're already registered for this wallet
    if (isRegistered && walletAddress.current === publicKey.toString()) {
      console.log("[GhostID Client] Already registered for this wallet")
      return true
    }

    console.log("[GhostID Client] Registering user with server")
    setIsLoading(true)
    registrationInProgress.current = true

    try {
      // Generate a random nickname with a timestamp to ensure uniqueness
      const randomNickname = `Anonymous-${Math.floor(Math.random() * 10000)}`
      const walletKey = publicKey.toString()

      const result = await registerUser(walletKey, randomNickname)

      if (result.success) {
        console.log("[GhostID Client] Registration successful")
        setIsRegistered(true)
        walletAddress.current = walletKey

        // If we got a Ghost ID as part of registration, use it
        if (result.ghostId) {
          console.log("[GhostID Client] Received Ghost ID during registration")
          setGhostId(result.ghostId)
          setFormattedGhostId(formatGhostId(result.ghostId))
          setTimeLeft(300) // Reset timer to 5 minutes
          setIsLoading(false)
          setError(null)
        }

        registrationInProgress.current = false
        return true
      } else {
        console.error("[GhostID Client] Registration failed:", result.error)
        setError(`Registration failed: ${result.error}`)
        setIsLoading(false)
        registrationInProgress.current = false
        return false
      }
    } catch (err) {
      console.error("[GhostID Client] Registration error:", err)
      setError("Registration error. Please try again.")
      setIsLoading(false)
      registrationInProgress.current = false
      return false
    }
  }, [connected, publicKey, isConnected, isRegistered])

  // Request Ghost ID from server
  const requestGhostId = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (ghostIdRequestInProgress.current) {
      console.log("[GhostID Client] Ghost ID request already in progress, skipping")
      return
    }

    if (!connected || !publicKey) {
      console.log("[GhostID Client] Not requesting Ghost ID: wallet not connected")
      return
    }

    if (!isConnected) {
      console.log("[GhostID Client] Not requesting Ghost ID: socket not connected")
      setError("Socket not connected. Retrying...")

      // Try to initialize the socket if it's not connected
      getSocket() || initializeSocket()

      // Set a retry timer
      setTimeout(() => {
        setRetryCount((prev) => prev + 1)
      }, 2000)

      return
    }

    // Make sure user is registered first
    if (!isRegistered) {
      console.log("[GhostID Client] User not registered, registering first")
      const registered = await registerWithServer()
      if (!registered) return // If registration failed, don't proceed
    }

    const now = Date.now()
    // Prevent multiple requests within 2 seconds
    if (now - lastRequestTime < 2000) {
      console.log("[GhostID Client] Skipping request, too soon since last request")
      return
    }

    console.log("[GhostID Client] Requesting Ghost ID from server")
    setIsLoading(true)
    setLastRequestTime(now)
    setError(null)
    ghostIdRequestInProgress.current = true

    try {
      const socketInstance = getSocket() || initializeSocket()
      socketInstance.emit("requestGhostId")

      // Set a timeout to clear the in-progress flag in case we don't get a response
      setTimeout(() => {
        ghostIdRequestInProgress.current = false
      }, 5000)
    } catch (err) {
      console.error("[GhostID Client] Error requesting Ghost ID:", err)
      setError("Error requesting Ghost ID. Please try again.")
      setIsLoading(false)
      ghostIdRequestInProgress.current = false
    }
  }, [connected, publicKey, lastRequestTime, isConnected, isRegistered, registerWithServer])

  // Force refresh Ghost ID
  const handleRefresh = async () => {
    if (!connected || !publicKey) return
    if (!isConnected) {
      setError("Socket not connected. Please try again later.")
      return
    }

    // Make sure user is registered first
    if (!isRegistered) {
      console.log("[GhostID Client] User not registered, registering first")
      const registered = await registerWithServer()
      if (!registered) return // If registration failed, don't proceed
    }

    console.log("[GhostID Client] Force refreshing Ghost ID")
    setIsLoading(true)
    setLastRequestTime(Date.now())
    setError(null)

    // Call external onRefresh if provided
    if (onRefresh) {
      onRefresh()
    }

    const socketInstance = getSocket() || initializeSocket()
    socketInstance.emit("forceRefreshGhostId")
  }

  // Copy Ghost ID to clipboard
  const handleCopy = () => {
    if (ghostId) {
      navigator.clipboard.writeText(ghostId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      // Call external onCopy if provided
      if (onCopy) {
        onCopy()
      }
    }
  }

  // Set up socket listeners for Ghost ID updates
  useEffect(() => {
    const socketInstance = getSocket() || initializeSocket()

    const handleGhostIdUpdated = (data: { ghostId: string }) => {
      console.log("[GhostID Client] Received updated Ghost ID from server")
      setGhostId(data.ghostId)
      setFormattedGhostId(formatGhostId(data.ghostId))
      setTimeLeft(300) // Reset timer to 5 minutes (300 seconds)
      setIsLoading(false)
      setError(null)
      ghostIdRequestInProgress.current = false
    }

    const handleError = (error: { message: string }) => {
      console.error("[GhostID Client] Socket error:", error.message)
      setError(`Error: ${error.message}`)
      setIsLoading(false)
      ghostIdRequestInProgress.current = false
      registrationInProgress.current = false
    }

    const handleConnect = () => {
      console.log("[GhostID Client] Socket connected")
      setError(null)
    }

    const handleDisconnect = () => {
      console.log("[GhostID Client] Socket disconnected")
      setError("Socket disconnected. Reconnecting...")
    }

    socketInstance.on("ghostIdUpdated", handleGhostIdUpdated)
    socketInstance.on("error", handleError)
    socketInstance.on("connect", handleConnect)
    socketInstance.on("disconnect", handleDisconnect)

    return () => {
      socketInstance.off("ghostIdUpdated", handleGhostIdUpdated)
      socketInstance.off("error", handleError)
      socketInstance.off("connect", handleConnect)
      socketInstance.off("disconnect", handleDisconnect)
    }
  }, [])

  // Handle wallet connection/disconnection
  useEffect(() => {
    // Skip if nothing changed
    if (publicKey && walletAddress.current === publicKey.toString()) {
      return
    }

    console.log("[GhostID Client] Wallet status changed:", connected ? "connected" : "disconnected")

    if (connected && publicKey) {
      // New wallet connected
      walletAddress.current = publicKey.toString()

      // Reset registration status for new wallet
      setIsRegistered(false)

      if (isConnected) {
        // Only attempt registration if socket is connected
        console.log("[GhostID Client] Wallet connected and socket connected, registering")

        // Use setTimeout to break potential render cycles
        setTimeout(() => {
          registerWithServer().then((success) => {
            if (success && !ghostId) {
              requestGhostId()
            }
          })
        }, 100)
      }
    } else if (!connected) {
      console.log("[GhostID Client] Wallet disconnected, clearing Ghost ID")
      setGhostId("")
      setFormattedGhostId("")
      setTimeLeft(300)
      setIsRegistered(false)
      walletAddress.current = null
      ghostIdRequestInProgress.current = false
      registrationInProgress.current = false
    }
  }, [connected, publicKey, isConnected, registerWithServer, requestGhostId, ghostId])

  // Handle socket connection changes
  useEffect(() => {
    if (isConnected && connected && publicKey && !isRegistered && !registrationInProgress.current) {
      console.log("[GhostID Client] Socket connected, wallet connected, not registered - registering")

      // Use setTimeout to break potential render cycles
      setTimeout(() => {
        registerWithServer()
      }, 100)
    }
  }, [isConnected, connected, publicKey, isRegistered, registerWithServer])

  // Retry requesting Ghost ID when retry count changes
  useEffect(() => {
    if (retryCount > 0 && connected && publicKey && isConnected) {
      console.log(`[GhostID Client] Retry attempt ${retryCount}`)

      // Use setTimeout to break potential render cycles
      setTimeout(() => {
        if (!isRegistered) {
          registerWithServer().then((success) => {
            if (success) requestGhostId()
          })
        } else {
          requestGhostId()
        }
      }, 100)
    }
  }, [retryCount, connected, publicKey, isConnected, isRegistered, registerWithServer, requestGhostId])

  // Set up timer for key rotation
  useEffect(() => {
    if (!connected || !publicKey || !isConnected || !isRegistered || !ghostId) return

    console.log("[GhostID Client] Setting up renewal timer")

    // Update time left every second
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        // If time's up, request a new Ghost ID
        if (prev <= 1) {
          console.log("[GhostID Client] Timer expired, requesting new Ghost ID")

          // Use setTimeout to break potential render cycles
          setTimeout(() => {
            requestGhostId()
          }, 100)

          return 300 // Reset to 5 minutes while waiting for response
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      console.log("[GhostID Client] Clearing renewal timer")
      clearInterval(timer)
    }
  }, [connected, publicKey, isConnected, isRegistered, ghostId, requestGhostId])

  // Format time left as MM:SS
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Expose refresh and copy methods for external use
  useEffect(() => {
    // Make the methods available to parent components via ref
    if (window) {
      ;(window as any).ghostIdMethods = {
        refresh: handleRefresh,
        copy: handleCopy,
        getGhostId: () => ghostId,
      }
    }

    return () => {
      if (window && (window as any).ghostIdMethods) {
        delete (window as any).ghostIdMethods
      }
    }
  }, [ghostId])

  if (!connected) {
    return <span className="text-gray-500 text-xs">Connect wallet to view</span>
  }

  return (
    <div className="flex items-center space-x-2">
      {error ? (
        <div className="flex items-center text-xs text-amber-500">
          <AlertCircle size={12} className="mr-1" />
          <span>{error}</span>
        </div>
      ) : isLoading || !ghostId ? (
        <div className="animate-pulse bg-[#222222] h-4 w-32 rounded"></div>
      ) : (
        <>
          <span className="font-mono text-sm text-[#FF4D00]">{formattedGhostId}</span>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">{formatTimeLeft()}</span>
          </div>
        </>
      )}
    </div>
  )
}

export default GhostIdDisplay
