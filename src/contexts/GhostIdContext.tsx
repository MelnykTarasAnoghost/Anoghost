"use client"

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
	ReactNode,
} from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { getSocket, initializeSocket, useSocket, registerUser } from "../services/socket"

// Define the context type with all the state and functions that will be exposed
type GhostIdContextType = {
	ghostId: string
	formattedGhostId: string
	isRegistered: boolean
	copied: boolean
	timeLeft: number
	isLoading: boolean
	error: string | null
	handleCopy: () => void
	handleRefresh: () => Promise<void>
	formatTimeLeft: () => string
}

// Create the context with an initial undefined value
const GhostIdContext = createContext<GhostIdContextType | undefined>(undefined)

// Provider component that manages the state and logic
export const GhostIdProvider = ({ children }: { children: ReactNode }) => {
	const { connected, publicKey } = useWallet()
	const { isConnected } = useSocket()
	const [ghostId, setGhostId] = useState<string>("")
	const [formattedGhostId, setFormattedGhostId] = useState<string>("")
	const [copied, setCopied] = useState(false)
	const [timeLeft, setTimeLeft] = useState<number>(300)
	const [isLoading, setIsLoading] = useState(false)
	const [lastRequestTime, setLastRequestTime] = useState<number>(0)
	const [error, setError] = useState<string | null>(null)
	const [retryCount, setRetryCount] = useState(0)
	const [isRegistered, setIsRegistered] = useState(false)

	const registrationInProgress = useRef(false)
	const ghostIdRequestInProgress = useRef(false)
	const walletAddress = useRef<string | null>(null)

	const formatGhostId = (id: string): string => {
		if (!id || id.length < 12) return id
		const prefix = id.substring(0, 12)
		return `${prefix.substring(0, 4)}-${prefix.substring(4, 8)}-${prefix.substring(8, 12)}`
	}

	const registerWithServer = useCallback(async () => {
		if (registrationInProgress.current) {
			return false
		}

		if (!connected || !publicKey || !isConnected) return false

		if (isRegistered && walletAddress.current === publicKey.toString()) {
			return true
		}

		setIsLoading(true);

		registrationInProgress.current = true

		try {
			const walletKey = publicKey.toString()

			// Register without a nickname
			const result = await registerUser(walletKey)

			if (result.success) {
				setIsRegistered(true)
				walletAddress.current = walletKey

				if (result.ghostId) {
					setGhostId(result.ghostId)
					setFormattedGhostId(formatGhostId(result.ghostId))
					setTimeLeft(300)
					setIsLoading(false)
					setError(null)
				}

				registrationInProgress.current = false
				return true
			} else {
				console.error("Registration failed:", result.error)
				setError(`Registration failed: ${result.error}`)
				setIsLoading(false)
				registrationInProgress.current = false
				return false
			}
		} catch (err) {
			console.error("Registration error:", err)
			setError("Registration error. Please try again.")
			setIsLoading(false)
			registrationInProgress.current = false
			return false
		}
	}, [connected, publicKey, isConnected, isRegistered])

	const requestGhostId = useCallback(async () => {
		if (ghostIdRequestInProgress.current) {
			return
		}
		if (!connected || !publicKey) {
			return
		}
		if (!isConnected) {
			setError("Socket not connected. Retrying...")
			getSocket() || initializeSocket()
			setTimeout(() => {
				setRetryCount((prev) => prev + 1)
			}, 2000)
			return
		}
		if (!isRegistered) {
			const registered = await registerWithServer()
			if (!registered) return
		}
		const now = Date.now()
		if (now - lastRequestTime < 2000) {
			return
		}
		setIsLoading(true)
		setLastRequestTime(now)
		setError(null)
		ghostIdRequestInProgress.current = true
		try {
			const socketInstance = getSocket() || initializeSocket()
			socketInstance.emit("requestGhostId")
			setTimeout(() => {
				ghostIdRequestInProgress.current = false
			}, 5000)
		} catch (err) {
			console.error("Error requesting Ghost ID:", err)
			setError("Error requesting Ghost ID. Please try again.")
			setIsLoading(false)
			ghostIdRequestInProgress.current = false
		}
	}, [connected, publicKey, lastRequestTime, isConnected, isRegistered, registerWithServer])

	const handleRefresh = useCallback(async () => {
		if (!connected || !publicKey) return
		if (!isConnected) {
			setError("Socket not connected. Please try again later.")
			return
		}
		if (!isRegistered) {
			const registered = await registerWithServer()
			if (!registered) return
		}
		setIsLoading(true)
		setLastRequestTime(Date.now())
		setError(null)
		const socketInstance = getSocket() || initializeSocket()
		socketInstance.emit("forceRefreshGhostId")
	}, [connected, publicKey, isConnected, isRegistered, registerWithServer])

	const handleCopy = useCallback(() => {
		if (ghostId) {
			navigator.clipboard.writeText(ghostId)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}, [ghostId])

	useEffect(() => {
		const socketInstance = getSocket() || initializeSocket()
		const handleGhostIdUpdated = (data: { ghostId: string }) => {
			setGhostId(data.ghostId)
			setFormattedGhostId(formatGhostId(data.ghostId))
			setTimeLeft(300)
			setIsLoading(false)
			setError(null)
			ghostIdRequestInProgress.current = false
		}
		const handleError = (error: { message: string }) => {
			console.error("Socket error:", error.message)
			setError(`Error: ${error.message}`)
			setIsLoading(false)
			ghostIdRequestInProgress.current = false
			registrationInProgress.current = false
		}
		const handleConnect = () => {
			setError(null)
		}
		const handleDisconnect = () => {
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

	useEffect(() => {
		if (publicKey && walletAddress.current === publicKey.toString()) {
			return
		}
		if (connected && publicKey) {
			walletAddress.current = publicKey.toString()
			setIsRegistered(false)
			if (isConnected) {
				setIsLoading(true);
				setTimeout(() => {
					registerWithServer().then((success) => {
						if (success && !ghostId) {
							requestGhostId()
						}
					})
				}, 100)
			}
		} else if (!connected) {
			setGhostId("")
			setFormattedGhostId("")
			setTimeLeft(300)
			setIsRegistered(false)
			walletAddress.current = null
			ghostIdRequestInProgress.current = false
			registrationInProgress.current = false
			setIsLoading(false);
		}
	}, [connected, publicKey, isConnected, registerWithServer, requestGhostId, ghostId])

	useEffect(() => {
		if (isConnected && connected && publicKey && !isRegistered && !registrationInProgress.current) {
			setTimeout(() => {
				registerWithServer()
			}, 100)
		}
	}, [isConnected, connected, publicKey, isRegistered, registerWithServer])

	useEffect(() => {
		if (retryCount > 0 && connected && publicKey && isConnected) {
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

	useEffect(() => {
		if (!connected || !publicKey || !isConnected || !isRegistered || !ghostId) return
		const timer = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					setTimeout(() => {
						requestGhostId()
					}, 100)
					return 300
				}
				return prev - 1
			})
		}, 1000)
		return () => {
			clearInterval(timer)
		}
	}, [connected, publicKey, isConnected, isRegistered, ghostId, requestGhostId])

	const formatTimeLeft = () => {
		const minutes = Math.floor(timeLeft / 60)
		const seconds = timeLeft % 60
		return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
	}

	const value: GhostIdContextType = {
		ghostId,
		formattedGhostId,
		isRegistered,
		copied,
		timeLeft,
		isLoading,
		error,
		handleCopy,
		handleRefresh,
		formatTimeLeft,
	}

	return <GhostIdContext.Provider value={value}>{children}</GhostIdContext.Provider>
}

// Custom hook to use the context
export const useGhostId = () => {
	const ctx = useContext(GhostIdContext)
	if (!ctx) throw new Error("useGhostId must be used inside GhostIdProvider")
	return ctx
}