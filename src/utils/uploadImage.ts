import {
    Metaplex,
    keypairIdentity,
    irysStorage,
    toMetaplexFile
  } from '@metaplex-foundation/js';
  import { Connection, Keypair } from '@solana/web3.js';
  
  export async function uploadImage(file: File, secretKey: Uint8Array): Promise<string> {
    const connection = new Connection('https://api.devnet.solana.com');
    const wallet = Keypair.fromSecretKey(secretKey);
  
    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(wallet))
      .use(irysStorage({
        address: 'https://node1.irys.xyz',
        providerUrl: 'https://api.devnet.solana.com',
        timeout: 60000,
      }));
  
    const buffer = await file.arrayBuffer();
    const metaplexFile = toMetaplexFile(buffer, file.name, { contentType: file.type });
  
    const uri = await metaplex.storage().upload(metaplexFile);
  
    return uri;
  }
  