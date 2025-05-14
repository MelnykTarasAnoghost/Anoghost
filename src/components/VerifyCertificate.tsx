import  { useState } from 'react'

import CertificateCard from './CertificateCard'
import type { FetchedCertificateMetadata } from '../types'
import { verifyCertificate } from '../utilits/nft'

export default function VerifyCertificate() {
  const [mint, setMint] = useState('')
  const [metadata, setMetadata] = useState<FetchedCertificateMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    setError(null)
    setMetadata(null)
    try {
      const data = await verifyCertificate(mint)
      setMetadata(data)
      console.log(metadata);
      
    } catch (e) {
      console.error(e)
      setError('Verification failed. Check mint address.')
    }
  }

  return (
    <div className="bg-[#1a1f2e]/30 p-6 rounded-lg border border-[#512da8]/50 transition-colors max-w-[500px] m-auto">
      <input
        type="text"
        placeholder="Enter mint address"
        className="input w-full p-3 border border-[#512da8]/20 focus:border-[#512da8] outline-0 hover:border-[#512da8] rounded-lg mb-5"
        value={mint}
        onChange={(e) => setMint(e.target.value)}
      />
      <button onClick={handleVerify} className="btn btn-accent w-full bg-[#512da8] p-3 cursor-pointer mb-10">
        Verify Certificate
      </button>
      
      {error && <p className="text-red-500">{error}</p>}
      {metadata && (<CertificateCard metadata={metadata} />)}
    </div>
  )
}
