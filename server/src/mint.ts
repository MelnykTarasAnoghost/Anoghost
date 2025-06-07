import { Umi, PublicKey, publicKey } from "@metaplex-foundation/umi";
import { TokenStandard, Creator as MetaplexCreator } from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";
import { initializeUmi } from './nft/umi/initialize-umi';
import { uploadMetadata } from './nft/upload/metadata/upload';
import { uploadNft } from './nft/upload';
import { confirmAssetCreation } from './nft/confirm-creation';
import { transferNft } from "./nft/transfer-nft";
import { generateTimelessGhostId, tryDecryptWithRotation } from "./ghostIdManager";

import {
    CreateNftServiceInput,
    CreateNftServiceOutput as SingleNftOutput,
} from "./nft/types";

interface ExtendedCreateNftServiceOutput extends SingleNftOutput {
    recipientAddress?: string;
    error?: string;
}

interface DecryptionResult {
    originalGhostId: string;
    decryptedWalletAddress?: string;
    error?: string;
}

export async function createNftService({
    metaData,
    ghosts,
    rpcUrl,
    irysUrl,
    appKeyPair,
    roomId,
    unchangable = false,
}: CreateNftServiceInput): Promise<ExtendedCreateNftServiceOutput[]> {
    console.log("[createNftService] Function called with:", { metaDataName: metaData.name, numGhosts: ghosts?.length, rpcUrl, irysUrl, appKey: appKeyPair.publicKey.toString(), roomId, unchangable });

    if (!metaData.imageUri) {
        console.error("[createNftService] Error: metaData.imageUri must be provided.");
        throw new Error("metaData.imageUri must be provided.");
    }
    console.log("[createNftService] imageUri provided:", metaData.imageUri);

    const finalImageUrl = metaData.imageUri;

    if (!ghosts || ghosts.length === 0) {
        console.error("[createNftService] Error: There must be at least one participant (ghost).");
        throw new Error("There must be at least one participant");
    }
    console.log(`[createNftService] Processing ${ghosts.length} ghosts.`);

    const masterSecret = process.env.MASTER_SECRET;
    if (!masterSecret) {
        console.error("[createNftService] CRITICAL ERROR: MASTER_SECRET env var is not set.");
        throw new Error("Server config error: MASTER_SECRET is missing.");
    }
    console.log("[createNftService] MASTER_SECRET found.");

    console.log("[createNftService] Initializing UMI...");
    const umi: Umi = initializeUmi(rpcUrl, irysUrl, appKeyPair);
    console.log("[createNftService] UMI initialized. UMI Identity:", umi.identity.publicKey.toString());
    console.log("[createNftService] UMI RPC Endpoint:", umi.rpc.getEndpoint());


    const individualNftResults: ExtendedCreateNftServiceOutput[] = [];

    console.log("[createNftService] Starting decryption for all ghost IDs...");
    const decryptionPromises = ghosts.map(originalGhostId =>
        new Promise<DecryptionResult>((resolve) => {
            console.log(`[createNftService] Attempting decryption for ghostId (prefix): ${originalGhostId.substring(0, 10)}...`);
            try {
                const decryptedWalletAddress = tryDecryptWithRotation(originalGhostId, masterSecret);
                console.log(`[createNftService] Decryption successful for ghostId (prefix): ${originalGhostId.substring(0, 10)}... -> Wallet: ${decryptedWalletAddress}`);
                resolve({ originalGhostId, decryptedWalletAddress });
            } catch (error: any) {
                console.error(`[createNftService] Decryption failed for ghostId (prefix) ${originalGhostId.substring(0, 10)}...: ${error.message}`);
                resolve({ originalGhostId, error: error.message || "Decryption failed" });
            }
        })
    );

    const settledDecryptionResults = await Promise.allSettled(decryptionPromises);
    console.log("[createNftService] All decryption promises settled.");

    const decryptionResults: DecryptionResult[] = settledDecryptionResults.map((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`[createNftService] Decryption result [${index}] fulfilled:`, result.value.decryptedWalletAddress ? `Wallet: ${result.value.decryptedWalletAddress}` : `Error: ${result.value.error}`);
            return result.value;
        } else {
            // This case should ideally not be hit if the promise constructor handles errors and resolves.
            console.error(`[createNftService] Unexpected promise rejection during decryption for ghostId at index ${index}:`, result.reason);
            // Attempt to get originalGhostId if possible, though it might be tricky if the promise itself rejected early.
            // For simplicity, we'll mark as unknown. If `ghosts[index]` is available, it could be used.
            const originalGhostIdAttempt = ghosts[index] || "unknown_original_id";
            return { originalGhostId: originalGhostIdAttempt, error: `Unknown promise rejection: ${result.reason?.message || result.reason}` };
        }
    });
    console.log("[createNftService] Processed decryption results:", decryptionResults);


    for (const result of decryptionResults) {
        const { originalGhostId, decryptedWalletAddress, error: decryptionError } = result;
        let currentMintAddressStr = "";
        console.log(`\n[createNftService] Processing NFT for originalGhostId (prefix): ${originalGhostId.substring(0, 10)}...`);

        if (decryptionError || !decryptedWalletAddress) {
            console.error(`[createNftService] Skipping NFT creation for ${originalGhostId.substring(0, 10)}... due to decryption error: ${decryptionError || "Unknown decryption error"}`);
            individualNftResults.push({
                mintAddress: "",
                transactionSignature: "",
                metadataUrl: "",
                imageUrl: finalImageUrl,
                error: `Processing failed for ${originalGhostId.substring(0, 10)}...: ${decryptionError || "Unknown decryption error"}`,
            });
            continue;
        }

        console.log(`[createNftService] Decrypted wallet for ${originalGhostId.substring(0, 10)}... is ${decryptedWalletAddress}`);

        try {
            console.log(`[createNftService] Preparing metadata for ${decryptedWalletAddress}`);
            const participantMetaData = JSON.parse(JSON.stringify(metaData)); // Deep copy
            const newEncryptedGhostAttributeValue = generateTimelessGhostId(decryptedWalletAddress, masterSecret);
            const newEncryptedRoomIdAttributeValue = generateTimelessGhostId(roomId, masterSecret);
            console.log(`[createNftService] Generated new encrypted ghost attribute for ${decryptedWalletAddress}`);
            console.log(`[createNftService] Generated new encrypted room ID attribute for room ${roomId}`);


            const ghostAttribute = {
                trait_type: "ghost",
                value: newEncryptedGhostAttributeValue,
            };

            const roomAttribute = {
                trait_type: "room_id_encrypted",
                value: newEncryptedRoomIdAttributeValue,
            };

            if (!participantMetaData.attributes) {
                participantMetaData.attributes = [];
            }
            participantMetaData.attributes.push(ghostAttribute);
            participantMetaData.attributes.push(roomAttribute);
            console.log(`[createNftService] Added ghost and room attributes to metadata for ${decryptedWalletAddress}`);

            console.log(`[createNftService] Uploading metadata for ${decryptedWalletAddress}...`);
            const metadataJsonUrl = await uploadMetadata(
                umi,
                participantMetaData,
                finalImageUrl,
                "gif" // Assuming image type, adjust if dynamic
            );
            console.log(`[createNftService] Metadata uploaded for ${decryptedWalletAddress}. URL: ${metadataJsonUrl}`);

            const onChainCreators: MetaplexCreator[] = [{
                address: appKeyPair.publicKey,
                verified: true,
                share: 100,
            }];

            if (onChainCreators.length === 1 && onChainCreators[0].share !== 100) {
                console.warn(`[createNftService] Correcting sole creator's share to 100 for ${decryptedWalletAddress}`);
                onChainCreators[0].share = 100;
            }
            console.log(`[createNftService] On-chain creators set for ${decryptedWalletAddress}:`, onChainCreators);


            const tokenStandardToUse = TokenStandard.ProgrammableNonFungible;
            console.log(`[createNftService] Using TokenStandard: ${TokenStandard[tokenStandardToUse]} for ${decryptedWalletAddress}`);

            console.log(`[createNftService] Uploading NFT for ${decryptedWalletAddress}...`);
            const { mintSigner, signature, tokenStandard: mintedTokenStandard } = await uploadNft(
                umi,
                participantMetaData,
                metadataJsonUrl,
                onChainCreators,
                unchangable,
                tokenStandardToUse,
                [process.env.SERVER_PUBLIC_KEY!]
            );
            console.log(`[createNftService] NFT uploaded for ${decryptedWalletAddress}. Mint: ${mintSigner.publicKey.toString()}, Signature: ${bs58.encode(signature)}`);

            const newMintAddress = mintSigner.publicKey;
            currentMintAddressStr = newMintAddress.toString();
            console.log(`[createNftService] New mint address for ${decryptedWalletAddress}: ${currentMintAddressStr}`);

            console.log(`[createNftService] Confirming asset creation for mint ${currentMintAddressStr.substring(0,10)}... (recipient: ${decryptedWalletAddress.substring(0,10)}...)`);
            const asset = await confirmAssetCreation(umi, newMintAddress);
            if (!asset) {
                console.error(`[createNftService] Asset not found after creation for mint ${currentMintAddressStr.substring(0,10)}... (recipient: ${decryptedWalletAddress.substring(0,10)}...)`);
                throw new Error(`Asset not found ${currentMintAddressStr.substring(0,10)}... for ${decryptedWalletAddress.substring(0,10)}...`);
            }
            console.log(`[createNftService] Asset confirmed for mint ${currentMintAddressStr.substring(0,10)}... (recipient: ${decryptedWalletAddress.substring(0,10)}...). Asset Name: ${asset.metadata.name}`);


            console.log(`[createNftService] Transferring NFT ${currentMintAddressStr.substring(0,10)}... to ${decryptedWalletAddress}...`);
            await transferNft({
                umi: umi,
                mint: newMintAddress,
                newOwner: publicKey(decryptedWalletAddress),
                tokenStandard: mintedTokenStandard,
            });
            console.log(`[createNftService] NFT ${currentMintAddressStr.substring(0,10)}... successfully transferred to ${decryptedWalletAddress}`);

            individualNftResults.push({
                mintAddress: currentMintAddressStr,
                transactionSignature: signature ? bs58.encode(signature) : "",
                metadataUrl: metadataJsonUrl,
                imageUrl: finalImageUrl,
                recipientAddress: decryptedWalletAddress,
            });
            console.log(`[createNftService] Successfully processed NFT for ${decryptedWalletAddress}. Mint: ${currentMintAddressStr}`);

        } catch (error: any) {
            const err = error as Error & { logs?: string[] }; // For Solana error logs
            console.error(`[createNftService] Error processing NFT for decrypted wallet ${decryptedWalletAddress} (original ghostId prefix: ${originalGhostId.substring(0,10)}...):`, err.message);
            if (err.logs) {
                console.error("[createNftService] Solana error logs:", err.logs);
            }
            individualNftResults.push({
                mintAddress: currentMintAddressStr || "", // May or may not be set if error occurred before minting
                transactionSignature: "",
                metadataUrl: "", // Might have been created, but tx failed
                imageUrl: finalImageUrl,
                recipientAddress: decryptedWalletAddress,
                error: `NFT Creation/Transfer failed: ${err.message}`,
            });
        }
    }

    const successes = individualNftResults.filter(r => !r.error && r.mintAddress).length;
    const failures = individualNftResults.length - successes;
    console.log(`\n[createNftService] Finished processing all NFTs. Total inputs: ${ghosts.length}. Successes: ${successes}, Failures: ${failures}`);
    if (failures > 0) {
        console.warn("[createNftService] Some NFTs failed to process. Details:", individualNftResults.filter(r => r.error));
    }


    return individualNftResults;
}