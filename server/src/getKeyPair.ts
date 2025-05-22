import {
    createUmi,
  } from "@metaplex-foundation/umi-bundle-defaults";
  import bs58 from "bs58";
  import { Keypair as UmiKeypair, PublicKey as UmiPublicKey } from "@metaplex-foundation/umi"; // Renamed to avoid conflict
  import dotenv from 'dotenv';
  dotenv.config(); 
  
  export async function getKeypairFromEnvironment(): Promise<UmiKeypair> {
    const privateKeyBase58EnvVar = process.env.SERVER_PRIVATE_KEY_BASE58!; // Added ! for non-null assertion after check
    const publicKeyEnvVar = process.env.SERVER_PUBLIC_KEY!;
  
    const expectedPublicKey = publicKeyEnvVar as UmiPublicKey;
    const umiTemp = createUmi(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");
    let derivedKeypair: UmiKeypair;
  
    try {
      derivedKeypair = umiTemp.eddsa.createKeypairFromSecretKey(bs58.decode(privateKeyBase58EnvVar));
    } catch (error) {
      throw new Error(
        "Failed to derive keypair via UMI from the provided secret key. Ensure the secret key is valid."
      );
    }
  
    if (derivedKeypair.publicKey !== expectedPublicKey) {
      throw new Error(
        "Derived public key does not match the expected public key. " +
        "Please check that you have the correct private key for the intended public key."
      );
    }
    return derivedKeypair;
  }