// src/components/ProfileCertificates.tsx

import  { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Metaplex } from '@metaplex-foundation/js'

import CertificateCard from './CertificateCard'
import type { FetchedCertificateMetadata } from '../types'
import { connection } from '../utilits/connection'

export default function ProfileCertificates() {
  const { publicKey } = useWallet()
  const [certs, setCerts] = useState<FetchedCertificateMetadata[]>([])

  useEffect(() => {
    if (!publicKey) return

    const mx = Metaplex.make(connection)

    // Замість load({ metadata: ... }) — беремо список NFT/SFT та їх .json
    mx.nfts()
      .findAllByOwner({ owner: publicKey })
      .then((nfts) => {
        // Кожен елемент — Nft | Sft, у них є властивість .json
        const metas = nfts.map((nft) =>
          nft.json as FetchedCertificateMetadata
        )
        setCerts(metas)
      })
      .catch((err) => {
        console.error('Failed to fetch NFTs:', err)
      })
  }, [publicKey])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {certs.map((metadata, idx) => (
        <CertificateCard key={idx} metadata={metadata} />
      ))}
    </div>
  )
}
