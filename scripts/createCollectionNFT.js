// scripts/createCollectionNFT.js
// scripts/createCollectionNFT.js
import fs from 'fs';
import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';
import { Metaplex, keypairIdentity, irysStorage } from '@metaplex-foundation/js';

// ESM-среда с Vite-подстановкой
const SOLANA_RPC = import.meta.env.VITE_SOLANA_NETWORK;
const BUNDLR_URL = import.meta.env.VITE_BUNDLR_NODE_URL;
const COLLECTION_URIS = JSON.parse(fs.readFileSync('./scripts/nfts/collectionURIs.json', 'utf-8'));
const SECRET = JSON.parse(fs.readFileSync('./scripts/wallet.json', 'utf-8'));

const keypair = Keypair.fromSecretKey(Uint8Array.from(SECRET));
const connection = new Connection(clusterApiUrl('devnet'));
const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(keypair))
  .use(irysStorage({ address: BUNDLR_URL, providerUrl: SOLANA_RPC }));

async function main() {
  if (!COLLECTION_URIS.length) throw new Error('No URIs, run upload first');
  const { nft } = await metaplex.nfts().create({
    uri: COLLECTION_URIS[0],
    name: 'AnoGhost DAO Access',
    symbol: 'AGDAO',
    sellerFeeBasisPoints: 0,
    isCollection: true,
  });
  console.log('Collection mint address:', nft.address.toBase58());
}

if (import.meta.main) main().catch(console.error);
