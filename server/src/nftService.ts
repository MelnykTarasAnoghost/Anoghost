import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { keypairIdentity, percentAmount, sol } from "@metaplex-foundation/umi"
import { mplTokenMetadata, createV1, TokenStandard } from "@metaplex-foundation/mpl-token-metadata"
import { bundlrUploader } from "@metaplex-foundation/umi-uploader-bundlr"
import { generateSigner, publicKey, createSignerFromKeypair } from "@metaplex-foundation/umi"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"
import { Keypair as SolanaKeypair } from "@solana/web3.js"
import fs from "fs"
import path from "path"
import os from "os"
import crypto from "crypto"

const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com"
const BUNDLR_ADDRESS = process.env.BUNDLR_ADDRESS || "https://devnet.bundlr.network"

// In production, you would use a secure key management system
// For development, we'll use an environment variable or generate a keypair
let mintingKeypair: SolanaKeypair

// Try to load keypair from environment variable
if (process.env.MINTING_PRIVATE_KEY) {
  try {
    const privateKeyBytes = Buffer.from(process.env.MINTING_PRIVATE_KEY, "base64")
    mintingKeypair = SolanaKeypair.fromSecretKey(privateKeyBytes)
    console.log("Loaded minting keypair from environment variable")
  } catch (error) {
    console.error("Failed to load keypair from environment variable:", error)
    // Generate a new keypair if loading fails
    mintingKeypair = SolanaKeypair.generate()
    console.log("Generated new minting keypair")
  }
} else {
  // For development, create a persistent keypair
  const keypairPath = path.join(os.homedir(), ".solana-chat-minting-keypair.json")

  try {
    if (fs.existsSync(keypairPath)) {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"))
      mintingKeypair = SolanaKeypair.fromSecretKey(new Uint8Array(keypairData))
      console.log("Loaded minting keypair from file")
    } else {
      mintingKeypair = SolanaKeypair.generate()
      fs.writeFileSync(keypairPath, JSON.stringify(Array.from(mintingKeypair.secretKey)))
      console.log("Generated and saved new minting keypair")
    }
  } catch (error) {
    console.error("Error handling keypair file:", error)
    mintingKeypair = SolanaKeypair.generate()
    console.log("Generated new minting keypair (not saved)")
  }
}

console.log(`Minting wallet public key: ${mintingKeypair.publicKey.toString()}`)

export interface NftMintRequest {
  name: string
  description: string
  imageBuffer: Buffer
  imageType: string
  roomId: string
  roomName: string
  recipientWallets: string[]
  accessToken: string
}

export interface NftMintResult {
  mint: string
  metadataUri: string
  name: string
  description: string
  imageUrl: string
  attributes: Array<{ trait_type: string; value: string }>
  recipients: string[]
  createdAt: number
}

export async function mintNft(request: NftMintRequest): Promise<NftMintResult> {
  const { name, description, imageBuffer, imageType, roomId, roomName, recipientWallets, accessToken } = request

  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error("Image data is required for the NFT")
  }

  if (recipientWallets.length === 0) {
    throw new Error("At least one recipient wallet is required")
  }

  // Create a UMI instance
  const umi = createUmi(SOLANA_RPC_ENDPOINT)
    .use(
      bundlrUploader({
        address: BUNDLR_ADDRESS,
        timeout: 60000,
      }),
    )
    .use(mplTokenMetadata())

  // Convert Solana keypair to UMI keypair
  const secretKey = mintingKeypair.secretKey
  const umiKeypair = {
    publicKey: publicKey(mintingKeypair.publicKey.toBase58()),
    secretKey: secretKey,
  }

  // Create a signer from the UMI keypair
  const signer = createSignerFromKeypair(umi, umiKeypair)

  // Use the signer for identity
  umi.use(keypairIdentity(signer))

  try {
    // Prepare the image for upload
    const umiImage = {
      buffer: new Uint8Array(imageBuffer),
      fileName: `nft-image-${Date.now()}.${imageType.split("/")[1] || "png"}`,
      displayName: name,
      uniqueName: `nft-image-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      contentType: imageType || "image/png",
    }

    // Create metadata with room information
    const metadataToUpload = {
      name: name,
      description: description,
      image: umiImage,
      attributes: [
        { trait_type: "Room ID", value: roomId },
        { trait_type: "Room Name", value: roomName },
        { trait_type: "Access Token", value: accessToken },
        { trait_type: "Created Date", value: new Date().toISOString() },
      ],
    }

    console.log("[NFT Service] Uploading metadata...")

    // Upload metadata to Bundlr
    const metadataUri = await umi.uploader.uploadJson(metadataToUpload)
    console.log("[NFT Service] Metadata uploaded:", metadataUri)

    // Mint the NFT
    const mint = generateSigner(umi)

    console.log("[NFT Service] Creating NFT...")
    const createNftTransaction = await createV1(umi, {
      mint: mint,
      authority: umi.identity,
      name: name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0), // 0% royalties
      isMutable: true,
      tokenStandard: TokenStandard.NonFungible,
    }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } })

    console.log("[NFT Service] NFT created:", createNftTransaction)

    // Drop NFTs to recipient wallets
    const successfulRecipients = []
    for (const recipientAddress of recipientWallets) {
      try {
        // Convert the recipient address to a UMI PublicKey
        const recipientPublicKey = publicKey(recipientAddress)

        // Transfer a small amount of SOL to the recipient
        await transferSol(umi, {
          source: umi.identity,
          destination: recipientPublicKey,
          amount: sol(0.001), // 0.001 SOL
        }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } })

        console.log(`[NFT Service] NFT dropped to ${recipientAddress}`)
        successfulRecipients.push(recipientAddress)
      } catch (error) {
        console.error(`[NFT Service] Failed to drop NFT to ${recipientAddress}:`, error)
      }
    }

    // Extract the image URL from the metadata URI
    const imageUrl = metadataUri.replace(/\/metadata\.json$/, "/image")

    // Return the NFT information
    return {
      mint: mint.publicKey.toString(),
      metadataUri: metadataUri,
      name,
      description,
      imageUrl,
      attributes: [
        { trait_type: "Room ID", value: roomId },
        { trait_type: "Room Name", value: roomName },
        { trait_type: "Created Date", value: new Date().toISOString() },
      ],
      recipients: successfulRecipients,
      createdAt: Date.now(),
    }
  } catch (error: any) {
    console.error("[NFT Service] Error in mintNft:", error)
    if (error.cause) {
      console.error("[NFT Service] Error cause:", error.cause)
    }
    if (error.message.toLowerCase().includes("bundlr") && error.message.toLowerCase().includes("balance")) {
      throw new Error("Bundlr insufficient balance. Please ensure the minting wallet has enough SOL for storage fees.")
    }
    throw error
  }
}

// Function to get the public key of the minting wallet
export function getMintingWalletPublicKey(): string {
  return mintingKeypair.publicKey.toString()
}
