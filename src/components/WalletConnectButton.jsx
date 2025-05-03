import React from 'react';
import { useWallet } from '../hooks/useWallet';

export default function WalletConnectButton({ setWalletAddress }) {
  const { walletAddress, connectWallet } = useWallet();

  // Передаём наверх адрес, если обновился
  React.useEffect(() => {
    if (walletAddress) {
      setWalletAddress(walletAddress);
    }
  }, [walletAddress]);

  return (
    <button
      onClick={connectWallet}
      className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow"
    >
      {walletAddress ? 'Wallet Connected ✅' : 'Connect Phantom Wallet'}
    </button>
  );
}

