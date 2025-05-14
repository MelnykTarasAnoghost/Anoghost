export interface MintMetadata {
    name: string
    symbol: string
    uri: string
  }
  
  export interface FetchedCertificateMetadata {
    name: string
    symbol: string
    description?: string
    image?: string
    attributes?: Array<{
      trait_type: string
      value: string
    }>
  }
  
  export interface NFT {
    address: string
    metadata: MintMetadata
  }
  export interface CertificateMetadata {
    name: string
    symbol: string
    uri: string            // URI на JSON, завантажений на Arweave або IPFS
  }
  