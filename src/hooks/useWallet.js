import { useState, useEffect } from 'react';

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState(null);

  useEffect(() => {
    // Проверка, подключён ли уже кошелёк (auto connect)
    if (window.solana?.isPhantom) {
      window.solana.connect({ onlyIfTrusted: true }).then((res) => {
        setWalletAddress(res.publicKey.toString());
      }).catch(() => {});
    }
  }, []);

  async function connectWallet() {
    if (window.solana?.isPhantom) {
      try {
        const resp = await window.solana.connect();
        setWalletAddress(resp.publicKey.toString());
      } catch (err) {
        console.error('Wallet connection error', err);
      }
    } else {
      alert('Phantom Wallet не найден. Пожалуйста, установи его: https://phantom.app/');
    }
  }

  return { walletAddress, connectWallet };
}
