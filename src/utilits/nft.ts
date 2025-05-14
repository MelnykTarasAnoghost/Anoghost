import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js'
import type { WalletAdapter } from '@solana/wallet-adapter-base'
import { PublicKey } from '@solana/web3.js'
import { connection } from './connection'
import type { MintMetadata, NFT, FetchedCertificateMetadata } from '../types'

export async function mintCertificate(
  wallet: WalletAdapter,
  metadata: MintMetadata
): Promise<NFT> {
  const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet))
  const { nft } = await metaplex.nfts().create({
    uri: metadata.uri,
    name: metadata.name,
    symbol: metadata.symbol,
    sellerFeeBasisPoints: 0,
    maxSupply: 1,
  })
  return { address: nft.address.toBase58(), metadata }
}

export async function verifyCertificate(
  mintAddress: string
): Promise<FetchedCertificateMetadata> {
  const metaplex = Metaplex.make(connection)
  const mintPubKey = new PublicKey(mintAddress)

  const nftObject = await metaplex.nfts().findByMint({ mintAddress: mintPubKey })

  let metadata = nftObject.json
  if (!metadata) {
    const response = await fetch(nftObject.uri)
    metadata = await response.json()
    
  }


  if (metadata.image.startsWith('ipfs://')) {
    metadata.image = metadata.image.replace(
      'ipfs://',
      'https://gateway.pinata.cloud/ipfs/'
    )
  }
  // Замінюємо ipfs:// → https://gateway.pinata.cloud/ipfs/
  

  return metadata as FetchedCertificateMetadata
}
