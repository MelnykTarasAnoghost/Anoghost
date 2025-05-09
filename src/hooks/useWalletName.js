
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export const useWalletName = () => {
  const { publicKey } = useWallet();
  const [walletName, setWalletName] = useState(null);

  useEffect(() => {
    if (publicKey) {
      // Временное отображение как псевдоним: первые и последние символы
      const shortName = `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`;
      setWalletName(shortName);
    } else {
      setWalletName(null);
    }
  }, [publicKey]);

  return walletName;
};
