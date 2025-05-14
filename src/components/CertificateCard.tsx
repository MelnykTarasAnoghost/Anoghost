
import type { FetchedCertificateMetadata } from '../types'

interface Props {
  metadata: FetchedCertificateMetadata
}

export default function CertificateCard({ metadata }: Props) {
  return (
    <div className="bg-surface border border-[#512da8]/50 rounded-lg p-4 shadow-sm">
      {metadata.image && (
        <img
          src={metadata.image}
          alt={metadata.name}
          className=" mb-3 rounded max-h-[250px]"
        />
      )}
      <h3 className="text-lg font-semibold mb-1">{metadata.name}</h3>
      <p className="text-gray-600 text-sm mb-2">{metadata.symbol}</p>
      {metadata.description && (
        <p className="text-gray-700 text-sm mb-2">{metadata.description}</p>
      )}
      {metadata.attributes && (
        <div className="flex flex-wrap gap-2">
          {metadata.attributes.map((attr) => (
            <span
              key={attr.trait_type}
              className="text-xs border-[#512da8]/50  text-gray-700 px-2 py-1 rounded"
            >
              {attr.trait_type}: {attr.value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
