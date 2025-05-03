import React from 'react';

const networks = ['mainnet-beta', 'testnet', 'devnet'];

export default function NetworkSelector({ selectedNetwork, onChange }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white mb-1">Solana Network</label>
      <select
        value={selectedNetwork}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-800 text-white px-3 py-2 rounded-lg w-full border border-zinc-600"
      >
        {networks.map((net) => (
          <option key={net} value={net}>
            {net}
          </option>
        ))}
      </select>
    </div>
  );
}
