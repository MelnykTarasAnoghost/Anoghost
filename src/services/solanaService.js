import { Connection, PublicKey } from '@solana/web3.js';

const SOLANA_NETWORK = 'https://api.mainnet-beta.solana.com';

export async function getWalletBalance(publicKey) {
  const connection = new Connection(SOLANA_NETWORK);
  const balance = await connection.getBalance(new PublicKey(publicKey));
  return balance / 1e9; // SOL
}

export async function checkNFTOwnership(publicKey, collectionAddress) {
  const connection = new Connection(SOLANA_NETWORK);

  const accounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(publicKey), {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });

  const nfts = accounts.value.filter((account) => {
    const amount = account.account.data.parsed.info.tokenAmount;
    return amount.uiAmount === 1 && account.account.data.parsed.info.mint === collectionAddress;
  });

  return nfts.length > 0;
}
