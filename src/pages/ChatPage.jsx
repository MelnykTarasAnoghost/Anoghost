import React, { useEffect, useState } from 'react';
import { getWalletBalance, checkNFTOwnership } from '../services/solanaService';

export default function ChatPage({ walletAddress, network }) {
  const [balance, setBalance] = useState(null);
  const [hasNFT, setHasNFT] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const bal = await getWalletBalance(walletAddress, network);
      setBalance(bal);

      const owns = await checkNFTOwnership(walletAddress, 'NFT_MINT_ADDRESS', network);
      setHasNFT(owns);
    }

    if (walletAddress) {
      fetchData();
    }
  }, [walletAddress, network]);

  return (
    <div className="mt-6 space-y-3 p-4 bg-zinc-800 rounded-xl shadow-md">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">Connected network:</p>
        <span className="px-2 py-1 bg-zinc-700 text-xs rounded-lg uppercase">
          {network}
        </span>
      </div>

      <div className="text-sm break-words">
        <strong>Wallet:</strong> {walletAddress}
      </div>

      <div>
        <strong>Balance:</strong> {balance !== null ? `${balance} SOL` : 'Loading...'}
      </div>

      <div>
        <strong>NFT Access:</strong> {hasNFT ? '✅ Allowed' : '❌ Denied'}
      </div>
    </div>
  );
}
