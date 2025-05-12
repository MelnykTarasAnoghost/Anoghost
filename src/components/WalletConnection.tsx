// src/components/WalletConnection.jsx
import React from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function WalletConnection() {
  return (
    <div className="p-4">
      <WalletMultiButton className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" />
    </div>
  )
}
