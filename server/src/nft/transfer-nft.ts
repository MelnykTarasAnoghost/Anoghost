import {
  transferV1,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata'
import { PublicKey, publicKey, type Umi } from '@metaplex-foundation/umi'

export async function transferNft({umi, mint, newOwner, tokenStandard}: {umi: Umi, mint: string | PublicKey, newOwner: string | PublicKey, tokenStandard: TokenStandard }) {
  try {

    const mintPublicKey = typeof mint === "string" ? publicKey(mint): mint
    const destinationOwner = typeof newOwner === "string" ? publicKey(newOwner) : newOwner

    const tx = await transferV1(umi, 
      {
        mint: mintPublicKey, 
        authority: umi.identity, 
        tokenOwner: umi.identity.publicKey, 
        destinationOwner: destinationOwner, 
        tokenStandard, 
      })
      .sendAndConfirm(umi)

    return tx
  } catch (error: any) {
    console.error('Failed to transfer NFT:', error.message)
    throw error
  }
}
