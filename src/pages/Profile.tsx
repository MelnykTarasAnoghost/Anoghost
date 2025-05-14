"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { Copy, ExternalLink, Filter, Grid, List, LogOut, Settings } from "lucide-react"

export default function ProfilePage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Mock data - would come from your actual data source
  const user = {
    name: "Alex Johnson",
    walletAddress: "5Gh7Ld3FqvNbpUVz9mNkBLkodBw82vhUjmCZvpWE8f3d",
    avatarUrl: "/placeholder.svg?height=100&width=100",
  }

  const credentials = [
    {
      id: "cred-001",
      title: "Blockchain Development Certificate",
      issuer: "University of Crypto",
      issueDate: "June 15, 2023",
      skills: ["Smart Contracts", "Solana", "Web3", "DeFi"],
      verified: true,
    },
    {
      id: "cred-002",
      title: "Advanced Solana Programming",
      issuer: "Solana Academy",
      issueDate: "August 3, 2023",
      skills: ["Rust", "Solana", "Program Development"],
      verified: true,
    },
    {
      id: "cred-003",
      title: "Web3 UX Design Fundamentals",
      issuer: "Design DAO",
      issueDate: "October 12, 2023",
      skills: ["UI/UX", "Web3", "Design Systems"],
      verified: true,
    },
    {
      id: "cred-004",
      title: "Tokenomics Specialist",
      issuer: "Crypto Economics Institute",
      issueDate: "January 20, 2024",
      skills: ["Tokenomics", "Economics", "Market Analysis"],
      verified: false,
    },
  ]

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  return (
    <div className="min-h-screen bg-[#0f1218]">
      {/* Profile Header */}
      <section className="py-12 px-4 bg-[#1a1f2e]">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-24 h-24 rounded-full bg-[#512da8]/20 flex items-center justify-center overflow-hidden">
              <img src={user.avatarUrl || "/placeholder.svg"} alt={user.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">{user.name}</h1>

              <div className="flex flex-col md:flex-row items-center gap-2 mb-4">
                <div className="flex items-center bg-[#1a1f2e]/80 border border-[#512da8]/20 rounded-full px-4 py-1">
                  <span className="text-[#e3e3e3]/70 mr-2">{truncateAddress(user.walletAddress)}</span>
                  <button
                    onClick={() => copyToClipboard(user.walletAddress)}
                    className="text-[#512da8] hover:text-[#512da8]/80 transition-colors"
                    aria-label="Copy wallet address"
                  >
                    <Copy size={16} />
                  </button>
                  <a
                    href={`https://explorer.solana.com/address/${user.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#512da8] hover:text-[#512da8]/80 transition-colors ml-2"
                    aria-label="View on Solana Explorer"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

              </div>

              
            </div>
          </div>
        </div>
      </section>

      {/* Credentials Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <h2 className="text-2xl font-bold mb-4 md:mb-0">My Credentials</h2>

            <div className="flex items-center gap-4">
              <button className="px-4 py-2 rounded-md bg-[#1a1f2e] border border-[#512da8]/30 text-[#e3e3e3] hover:bg-[#1a1f2e]/80 transition-colors text-sm flex items-center gap-1">
                <Filter size={16} />
                <span>Filter</span>
              </button>

              <div className="flex bg-[#1a1f2e] border border-[#512da8]/30 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-[#512da8]/20 text-[#512da8]" : "text-[#e3e3e3]/70"}`}
                  aria-label="Grid view"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-[#512da8]/20 text-[#512da8]" : "text-[#e3e3e3]/70"}`}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="bg-[#1a1f2e]/30 p-6 rounded-lg border border-[#512da8]/20 hover:border-[#512da8]/50 transition-colors"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-[#512da8] flex items-center justify-center">
                        <span className="font-bold">
                          {credential.issuer
                            .split(" ")
                            .map((word) => word[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="font-bold">{credential.issuer}</div>
                        <div className="text-sm text-[#e3e3e3]/70">
                          {credential.verified ? "Verified Issuer" : "Pending Verification"}
                        </div>
                      </div>
                    </div>
                    {credential.verified && (
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M9 12L11 14L15 10"
                          stroke="#512da8"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="9" stroke="#512da8" strokeWidth="2" />
                      </svg>
                    )}
                  </div>
                  <div className="mb-4">
                    <h3 className="text-xl font-bold mb-1">{credential.title}</h3>
                    <p className="text-[#e3e3e3]/70">Date: {credential.issueDate}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {credential.skills.map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-[#512da8]/20 rounded-full text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-[#e3e3e3]/50 flex items-center">
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                        stroke="#e3e3e3"
                        strokeOpacity="0.5"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 6V12L16 14"
                        stroke="#e3e3e3"
                        strokeOpacity="0.5"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Verified on Solana • NFT ID: Sol...8f3d
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="bg-[#1a1f2e]/30 p-4 rounded-lg border border-[#512da8]/20 hover:border-[#512da8]/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-[#512da8] flex items-center justify-center mr-3">
                        <span className="font-bold">
                          {credential.issuer
                            .split(" ")
                            .map((word) => word[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold">{credential.title}</h3>
                        <p className="text-sm text-[#e3e3e3]/70">{credential.issuer}</p>
                      </div>
                    </div>

                    <div className="md:ml-auto flex flex-wrap gap-2">
                      {credential.skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-[#512da8]/20 rounded-full text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-[#e3e3e3]/70">
                      <span>{credential.issueDate}</span>
                      {credential.verified && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M9 12L11 14L15 10"
                            stroke="#512da8"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="12" cy="12" r="9" stroke="#512da8" strokeWidth="2" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {credentials.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#512da8]/10 flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M19 11H5M19 11C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11M19 11V9C19 7.89543 18.1046 7 17 7M5 11V9C5 7.89543 5.89543 7 7 7M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7M7 7H17"
                    stroke="#512da8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">No Credentials Yet</h3>
              <p className="text-[#e3e3e3]/70 mb-6">You haven't created any credentials yet.</p>
              <button className="px-6 py-2 rounded-md bg-[#512da8] text-white hover:bg-[#512da8]/90 transition-colors">
                Create Your First Credential
              </button>
            </div>
          )}

          {/* Create New Credential Button */}
          {credentials.length > 0 && (
            <div className="mt-8 text-center">
              <button className="px-6 py-2 rounded-md bg-[#512da8] text-white hover:bg-[#512da8]/90 transition-colors">
                Create New Credential
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
