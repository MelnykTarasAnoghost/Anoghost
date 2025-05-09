// This file is no longer needed as the NFT minting logic has been moved to the backend
// It's kept here for reference but can be removed
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { mplTokenMetadata, createV1, TokenStandard } from "@metaplex-foundation/mpl-token-metadata"
import { bundlrUploader } from "@metaplex-foundation/umi-uploader-bundlr"
import { generateSigner, publicKey, percentAmount, sol } from "@metaplex-foundation/umi"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"

const SOLANA_RPC_ENDPOINT = "https://api.devnet.solana.com"
const BUNDLR_ADDRESS = "https://devnet.bundlr.network"

export interface NftFormData {
  name: string
  description: string
  date: string
  imageFile: File
  roomId: string
  roomName: string
  recipientWallets: string[]
}

export interface NftWallet {
  publicKey: any
  signTransaction: any
}

export async function mintNftRequest(formData: NftFormData, wallet: NftWallet) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    console.error("[API] Wallet not connected or does not support signing.")
    throw new Error("Wallet not connected or does not support signing.")
  }

  const { name, description, date, imageFile, roomId, roomName, recipientWallets } = formData
  if (!imageFile) {
    console.error("[API] Image file is required.")
    throw new Error("Image file is required for the NFT.")
  }

  if (recipientWallets.length === 0) {
    console.error("[API] At least one recipient wallet is required.")
    throw new Error("At least one recipient wallet is required.")
  }

  const umi = createUmi(SOLANA_RPC_ENDPOINT)
    .use(walletAdapterIdentity(wallet))
    .use(mplTokenMetadata())
    .use(
      bundlrUploader({
        address: BUNDLR_ADDRESS,
        timeout: 60000,
      }),
    )

  try {
    // Upload the image to Bundlr
    const imageBuffer = await imageFile.arrayBuffer()
    const umiImage = {
      buffer: new Uint8Array(imageBuffer),
      fileName: imageFile.name,
      displayName: name,
      uniqueName: `${imageFile.name}-${Date.now()}`,
      contentType: imageFile.type || "image/png",
    }

    // Create metadata with room information
    const metadataToUpload = {
      name: name,
      description: description,
      image: umiImage,
      attributes: [
        { trait_type: "Room ID", value: roomId },
        { trait_type: "Room Name", value: roomName },
        { trait_type: "Created Date", value: date },
      ],
    }

    // Upload metadata to Bundlr
    const metadataUri = await umi.uploader.uploadJson(metadataToUpload)
    console.log("[API] Metadata uploaded:", metadataUri)

    // Mint the NFT
    const mint = generateSigner(umi)

    const createNftTransaction = await createV1(umi, {
      mint: mint,
      authority: umi.identity,
      name: name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0), // 0% royalties
      isMutable: true,
      tokenStandard: TokenStandard.NonFungible,
    }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } })

    console.log("[API] NFT created:", createNftTransaction)

    // Drop NFTs to recipient wallets
    const recipients = []
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

        console.log(`[API] NFT dropped to ${recipientAddress}`)
        recipients.push(recipientAddress)
      } catch (error) {
        console.error(`[API] Failed to drop NFT to ${recipientAddress}:`, error)
      }
    }

    // Return the NFT information
    return {
      mint: mint.publicKey.toString(),
      metadataUri: metadataUri,
      name,
      description,
      image: URL.createObjectURL(imageFile),
      attributes: [
        { trait_type: "Room ID", value: roomId },
        { trait_type: "Room Name", value: roomName },
        { trait_type: "Created Date", value: date },
      ],
      recipients,
      createdAt: Date.now(),
    }
  } catch (error: any) {
    console.error("[API] Error in mintNftRequest:", error)
    if (error.cause) {
      console.error("[API] Error cause:", error.cause)
    }
    if (error.message.toLowerCase().includes("bundlr") && error.message.toLowerCase().includes("balance")) {
      throw new Error("Bundlr insufficient balance. Please ensure your Devnet wallet has enough SOL for storage fees.")
    }
    throw error
  }
}
