import { useState } from 'react'
import axios from 'axios'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { mintCertificate } from '../utilits/nft'

const PINATA_API_KEY = '8a224262d33aa3e2858b'
const PINATA_SECRET_API_KEY = 'a633499e952d7c2b99397a679381ece598b6f1d1f30b7cb42fc124b3e4ec9261'

export default function IssueCertificate() {
  const { wallet, publicKey } = useWallet()
  const { connection } = useConnection()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const uploadFileToPinata = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      //@ts-ignore
      maxContentLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${(formData as any)._boundary}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    })

    return res.data.IpfsHash // CID
  }

  const uploadJSONToPinata = async (json: Object) => {
    const res = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', json, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    })

    return res.data.IpfsHash // CID
  }

  const handleMint = async () => {
    if (!wallet || !publicKey) return alert('Connect your wallet first')
    if (!name || !file) return alert('Fill in all fields')

    setLoading(true)
    try {
      // 1️⃣ Upload image to Pinata
      const imageCID = await uploadFileToPinata(file)
      const imageURI = `ipfs://${imageCID}`

      // 2️⃣ Create metadata.json object
      const metadataJSON = {
        name: name,
        symbol: 'CERT',
        description: description,
        image: imageURI,
      }

      // 3️⃣ Upload metadata.json to Pinata
      const metadataCID = await uploadJSONToPinata(metadataJSON)
      const metadataURI = `https://gateway.pinata.cloud/ipfs/${metadataCID}`

      // 4️⃣ Mint NFT with metadata URI
      const metadata = {
        name,
        symbol: 'CERT',
        uri: metadataURI,
      }

      const nft = await mintCertificate(wallet.adapter, metadata)
      alert(`✅ NFT Minted: ${nft.address}`)
    } catch (err) {
      console.error(err)
      alert('❌ Mint failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#1a1f2e]/30 p-6 rounded-lg border border-[#512da8]/50 transition-colors max-w-[500px] m-auto" >
      <input
        type="text"
        placeholder="NFT Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input w-full p-3 border border-[#512da8]/20 focus:border-[#512da8] outline-0 hover:border-[#512da8] rounded-lg mb-5"
      />
      <textarea
        placeholder="NFT description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="input w-full p-3 border border-[#512da8]/20 focus:border-[#512da8] outline-0 hover:border-[#512da8] rounded-lg mb-5"
      />
      <input
        type="file"
        accept="image/*"
        placeholder='Upload image'
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] || null
          setFile(selectedFile)
        }}
        className="input w-full p-3 border border-[#512da8]/20 focus:border-[#512da8] outline-0 hover:border-[#512da8] rounded-lg mb-5 cursor-pointer"
      />
      <button
        onClick={handleMint}
        disabled={loading}
        className="btn btn-accent w-full bg-[#512da8] p-3 cursor-pointer  "
      >
        {loading ? 'Minting…' : 'Issue Certificate'}
      </button>
    </div>
  )
}
