// src/utils/getProvider.js
import { Connection, clusterApiUrl } from '@solana/web3.js'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'

export function getProvider(wallet, network = WalletAdapterNetwork.Devnet) {
  if (!wallet || !wallet.connected) throw new Error('Wallet not connected')
  return {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction.bind(wallet),
    signAllTransactions: wallet.signAllTransactions.bind(wallet),
    connection: new Connection(clusterApiUrl(network), 'confirmed'),
  }
}
