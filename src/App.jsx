import React, { useState } from 'react';
import WalletConnectButton from './components/WalletConnectButton';
import ChatPage from './pages/ChatPage';
import NetworkSelector from './components/NetworkSelector';

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [network, setNetwork] = useState('devnet');

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4">
      <div className="max-w-md mx-auto">
        <WalletConnectButton setWalletAddress={setWalletAddress} />
        <NetworkSelector selectedNetwork={network} onChange={setNetwork} />
        {walletAddress && (
          <ChatPage walletAddress={walletAddress} network={network} />
        )}
      </div>
    </div>
  );
}

export default App;
