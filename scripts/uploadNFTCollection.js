// scripts/uploadNFTCollection.js
import fs from 'fs';
import path from 'path';
import Bundlr from '@bundlr-network/client';
import mime from 'mime';
import { Buffer } from 'buffer';

// ESM-среда с Vite-подстановкой
const BUNDLR_URL = import.meta.env.VITE_BUNDLR_NODE_URL;
const SOLANA_RPC = import.meta.env.VITE_SOLANA_NETWORK;
const KEYPAIR = JSON.parse(fs.readFileSync('./scripts/wallet.json', 'utf-8'));

const bundlr = new Bundlr(BUNDLR_URL, 'solana', KEYPAIR, { providerUrl: SOLANA_RPC });

async function uploadFile(filePath) {
  await bundlr.ready();
  const data = fs.readFileSync(filePath);
  const contentType = mime.getType(filePath);
  const tx = bundlr.createTransaction(data, { tags: [{ name: 'Content-Type', value: contentType }] });
  await tx.sign();
  const res = await tx.upload();
  return `https://arweave.net/${res.id}`;
}

export async function main() {
  const imagesDir = './scripts/nfts/images';
  const metadataDir = './scripts/nfts/metadata';
  const uris = [];

  for (const file of fs.readdirSync(imagesDir)) {
    if (!file.endsWith('.png')) continue;
    const imgUri = await uploadFile(path.join(imagesDir, file));

    const metaPath = path.join(metadataDir, file.replace('.png', '.json'));
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.image = imgUri;
    const tmp = Buffer.from(JSON.stringify(meta));
    const tx = bundlr.createTransaction(tmp, { tags: [{ name: 'Content-Type', value: 'application/json' }] });
    await tx.sign();
    const mres = await tx.upload();
    const metaUri = `https://arweave.net/${mres.id}`;

    console.log(file, '→', imgUri, metaUri);
    uris.push(metaUri);
  }

  fs.writeFileSync('./scripts/nfts/collectionURIs.json', JSON.stringify(uris, null, 2));
  console.log('✅ URIs saved');
}

if (import.meta.main) main().catch(console.error);
