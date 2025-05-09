// src/services/nftService.js
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js'
import { Metaplex } from '@metaplex-foundation/js'

const COLLECTION = import.meta.env.VITE_NFT_COLLECTION_ADDRESS

export async function userHasNFT(walletPubkey) {
  if (!walletPubkey) return false
  const connection = new Connection(clusterApiUrl('devnet'))
  const metaplex = new Metaplex(connection)
  const nfts = await metaplex.nfts().findAllByOwner({ owner: new PublicKey(walletPubkey) })
  return nfts.some(nft => nft.collection?.address.toBase58() === COLLECTION)
}

