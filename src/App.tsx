import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import Home    from './pages/Home';
import Issue   from './pages/Issue';
import Verify  from './pages/Verify';
import Header from './components/Header';
import Profile from './pages/Profile';

const NETWORK = 'https://api.devnet.solana.com';
const wallets = [new PhantomWalletAdapter()];

const App = () => (
  <ConnectionProvider endpoint={NETWORK}>
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
       <Header />
          <Routes>
            <Route path="/"        element={<Home   />} />
            <Route path="/issue"   element={<Issue  />} />
            <Route path="/verify"  element={<Verify />} />
            <Route path="/profile"  element={<Profile />} />
          </Routes>
   
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);

export default App;
