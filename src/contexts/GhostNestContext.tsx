// GhostNestContext.tsx
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

type GhostNestContextType = {
  API_URL: string
  setAPI_URL: (url: string) => void
}

const GhostNestContext = createContext<GhostNestContextType | undefined>(undefined)

// Available nests (centralized list)
const AVAILABLE_NESTS = [
  { name: "Nest-1", url: "http://localhost:80" },
]

export const GhostNestProvider = ({ children }: { children: ReactNode }) => {
  const [API_URL, setAPI_URL] = useState<string>("")

  // Pick a random nest on first load
  useEffect(() => {
    if (!API_URL) {
      const randomNest = AVAILABLE_NESTS[Math.floor(Math.random() * AVAILABLE_NESTS.length)]
      setAPI_URL(randomNest.url)
    }
  }, [API_URL])

  return (
    <GhostNestContext.Provider value={{ API_URL, setAPI_URL }}>
      {children}
    </GhostNestContext.Provider>
  )
}

export const useGhostNest = () => {
  const context = useContext(GhostNestContext)
  if (!context) {
    throw new Error("useGhostNest must be used within a GhostNestProvider")
  }
  return context
}

// Export nests so the selector uses the same list
export { AVAILABLE_NESTS }
