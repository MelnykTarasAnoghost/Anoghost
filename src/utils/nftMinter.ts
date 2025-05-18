import {
  Connection,
  SystemProgram,
  Transaction,
  PublicKey as Web3JsPublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  BlockhashWithExpiryBlockHeight,
  Commitment,
} from "@solana/web3.js";
import { Wallet } from "@solana/wallet-adapter-react";

// Wallet address for the DApp to receive upfront payment
const DAPP_WALLET_ADDRESS = "5MqevyFxj2egKbgmtCGwANqUSBCJ9ebL1LMMrcLtvWJN"; // Replace with your actual DApp wallet address
const AMOUNT_TO_PAY_SOL = 0; //0.02257 0.01974

// Corrected API endpoint for the server
const SERVER_API_MINT_NFT_ENDPOINT = "http://localhost:3001/api/mint"; // Updated endpoint

// Interface for the input parameters of this client-side function
export interface ClientGenerateNftInput {
  name: string;
  description: string;
  imageFile: File; // The actual image file from a file input
  recipients: string[]; // For off-chain metadata creators
  wallet: Wallet | null; // The connected user's wallet adapter
  symbol?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  collectionDetails?: { name: string; family: string };
  sellerFeeBasisPoints?: number;
  // Optional RPC and Irys URLs if you want the client to suggest them to the server
  rpcUrl?: string;
  irysUrl?: string;
}

// Interface for the expected response from the server's NFT generation endpoint
export interface NftGenerationServerResponse {
  mintAddress?: string;
  transactionSignature?: string; // Solana mint signature (base58 encoded by server)
  metadataUrl?: string;
  imageUrl?: string;
  error?: string; // If an error occurred on the server
}


export async function callGenerateNftApi({
  name,
  description,
  imageFile,
  recipients,
  wallet,
  symbol = "NFT", // Default symbol
  external_url = "",
  attributes = [],
  collectionDetails = { name: "Custom Collection", family: "Generated NFTs" }, // Default collection details
  sellerFeeBasisPoints = 500, // Default 5%
  rpcUrl, // Optional client-provided RPC URL
  irysUrl, // Optional client-provided Irys URL
}: ClientGenerateNftInput): Promise<NftGenerationServerResponse> {
  if (!wallet || !wallet.adapter || !wallet.adapter.publicKey || !wallet.adapter.sendTransaction) {
    throw new Error("Wallet adapter with public key and sendTransaction method is required.");
  }

  const userPublicKey = wallet.adapter.publicKey;
  // Consider making RPC URL and commitment configurable or dynamic based on environment
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed" as Commitment);

  let paymentSignature = "";
  let latestBlockhash: BlockhashWithExpiryBlockHeight;

  // Step 1: Upfront SOL Payment (Client-Side)
  try {
    console.log(`Initiating SOL payment of ${AMOUNT_TO_PAY_SOL} SOL to ${DAPP_WALLET_ADDRESS}...`);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: new Web3JsPublicKey(DAPP_WALLET_ADDRESS),
        lamports: AMOUNT_TO_PAY_SOL * LAMPORTS_PER_SOL,
      })
    );
    transaction.feePayer = userPublicKey;
    latestBlockhash = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = latestBlockhash.blockhash;

    // Sign and send the transaction using the wallet adapter
    paymentSignature = await wallet.adapter.sendTransaction(transaction, connection);
    console.log("Payment transaction sent, signature:", paymentSignature);

    // Confirm the transaction
    await connection.confirmTransaction(
      {
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: paymentSignature,
      },
      "confirmed" as Commitment
    );
    console.log("Upfront SOL payment successful, signature confirmed:", paymentSignature);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("SOL Payment Error:", error);
    throw new Error(`Failed to make the upfront SOL payment: ${errorMessage}`);
  }

  // Step 2: Call the Server API to Generate NFT
  try {
    console.log("Preparing FormData for NFT generation API call...");
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("imageFile", imageFile, imageFile.name); // Append the actual file with its name
    formData.append("recipients", JSON.stringify(recipients));
    formData.append("symbol", symbol);
    formData.append("external_url", external_url);
    formData.append("attributes", JSON.stringify(attributes));

    if (collectionDetails) {
        formData.append("collectionDetails", JSON.stringify(collectionDetails));
    }
    formData.append("sellerFeeBasisPoints", sellerFeeBasisPoints.toString());

    // Optionally pass RPC and Irys URLs if provided by client
    if (rpcUrl) {
        formData.append("rpcUrl", rpcUrl);
    }
    if (irysUrl) {
        formData.append("irysUrl", irysUrl);
    }

    // These fields were in your original client code. The server currently doesn't explicitly use them
    // in its generateNft function's GenerateNftInput, but they could be used for logging or other server-side checks if needed.
    // formData.append("userPublicKey", userPublicKey.toBase58());
    // formData.append("paymentSignature", paymentSignature); // The server might want to verify this payment

    console.log(`Sending request to NFT generation server: ${SERVER_API_MINT_NFT_ENDPOINT}`);
    const response = await fetch(SERVER_API_MINT_NFT_ENDPOINT, {
      method: "POST",
      body: formData,
      // Headers are not typically needed for FormData with fetch, browser sets Content-Type automatically
    });

    const result: NftGenerationServerResponse = await response.json();

    if (!response.ok) {
      console.error("Server Error Response:", result);
      throw new Error(result.error || `Server responded with status ${response.status}`);
    }

    console.log("NFT Generation successful, server response:", result);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("NFT Generation API Call Error:", error);
    // It might be useful to inform the user that the payment was made but NFT generation failed,
    // and provide the paymentSignature for potential refund or retry logic.
    throw new Error(`NFT generation process failed after payment: ${errorMessage}. Payment signature: ${paymentSignature}`);
  }
}
