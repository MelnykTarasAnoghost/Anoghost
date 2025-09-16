// src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';
import { GhostNestProvider } from './contexts/GhostNestContext';
import { GhostIdProvider } from './contexts/GhostIdContext';
import ChatRoomWrapper from './wrappers/ChatRoomWrapper';
import CreateRoomWrapper from './wrappers/CreateChatRoomWrapper';

const App = () => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = React.useMemo(() => clusterApiUrl(network), [network]);
  const wallets = React.useMemo(() => [new PhantomWalletAdapter()], [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <GhostNestProvider>
            <GhostIdProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  {/* The new route for creating a room */}
                  <Route path="/c" element={<CreateRoomWrapper />} />
                  {/* The existing route for joining/viewing a room */}
                  <Route path="/r" element={<ChatRoomWrapper />} />
                </Routes>
              </Router>
            </GhostIdProvider>
          </GhostNestProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;