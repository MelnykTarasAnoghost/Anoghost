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
    unchangable = false,
}: CreateNftServiceInput): Promise<ExtendedCreateNftServiceOutput[]> {
    if (!metaData.imageUri) {
        throw new Error("metaData.imageUri must be provided.");
    }

    const finalImageUrl = metaData.imageUri;

    if (!ghosts || ghosts.length === 0) {
        throw new Error("There must be at least one participant");
    }

    const masterSecret = process.env.MASTER_SECRET;
    if (!masterSecret) {
        console.error("MASTER_SECRET env var is not set.");
        throw new Error("Server config error: MASTER_SECRET is missing.");
    }

    const umi: Umi = initializeUmi(rpcUrl, irysUrl, appKeyPair);
    const individualNftResults: ExtendedCreateNftServiceOutput[] = [];

    const decryptionPromises = ghosts.map(originalGhostId => 
        new Promise<DecryptionResult>((resolve) => {
            try {
                const decryptedWalletAddress = tryDecryptWithRotation(originalGhostId, masterSecret);
                resolve({ originalGhostId, decryptedWalletAddress });
            } catch (error: any) {
                console.error(`Decryption failed for ${originalGhostId.substring(0,10)}...: ${error.message}`);
                resolve({ originalGhostId, error: error.message || "Decryption failed" });
            }
        })
    );

    const settledDecryptionResults = await Promise.allSettled(decryptionPromises);
    
    const decryptionResults: DecryptionResult[] = settledDecryptionResults.map(result => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            console.error("Unexpected promise rejection during decryption:", result.reason);
            return { originalGhostId: "unknown_due_to_rejection", error: "Unknown promise rejection" };
        }
    });


    for (const result of decryptionResults) {
        const { originalGhostId, decryptedWalletAddress, error: decryptionError } = result;
        let currentMintAddressStr = "";

        if (decryptionError || !decryptedWalletAddress) {
            individualNftResults.push({
                mintAddress: "", 
                transactionSignature: "", 
                metadataUrl: "", 
                imageUrl: finalImageUrl, 
                error: `Processing failed for ${originalGhostId.substring(0,10)}...: ${decryptionError || "Unknown decryption error"}`,
            });
            continue;
        }

        try {
            const participantMetaData = JSON.parse(JSON.stringify(metaData));
            const newEncryptedGhostAttributeValue = generateTimelessGhostId(decryptedWalletAddress, masterSecret);

            const ghostAttribute = {
                trait_type: "ghost",
                value: newEncryptedGhostAttributeValue, 
            };

            if (!participantMetaData.attributes) {
                participantMetaData.attributes = [];
            }
            participantMetaData.attributes.push(ghostAttribute);

            const metadataJsonUrl = await uploadMetadata(
                umi,
                participantMetaData,
                finalImageUrl,
                "gif" 
            );

            const onChainCreators: MetaplexCreator[] = [{
                address: appKeyPair.publicKey,
                verified: true,
                share: 100,
            }];

            if (onChainCreators.length === 1 && onChainCreators[0].share !== 100) {
                onChainCreators[0].share = 100;
            }

            const tokenStandardToUse = TokenStandard.ProgrammableNonFungible;

            const { mintSigner, signature, tokenStandard: mintedTokenStandard } = await uploadNft(
                umi,
                participantMetaData,
                metadataJsonUrl,
                onChainCreators,
                unchangable,
                tokenStandardToUse,
                [process.env.SERVER_PUBLIC_KEY!]
            );

            const newMintAddress = mintSigner.publicKey;
            currentMintAddressStr = newMintAddress.toString();

            const asset = await confirmAssetCreation(umi, newMintAddress);
            if (!asset) {
                throw new Error(`Asset not found ${currentMintAddressStr.substring(0,10)}... for ${decryptedWalletAddress.substring(0,10)}...`);
            }

            await transferNft({
                umi: umi,
                mint: newMintAddress,
                newOwner: publicKey(decryptedWalletAddress),
                tokenStandard: mintedTokenStandard,
            });

            individualNftResults.push({
                mintAddress: currentMintAddressStr,
                transactionSignature: signature ? bs58.encode(signature) : "",
                metadataUrl: metadataJsonUrl,
                imageUrl: finalImageUrl,
                recipientAddress: decryptedWalletAddress, 
            });

        } catch (error: any) { 
            const err = error as Error & { logs?: string[] }; 
            individualNftResults.push({
                mintAddress: currentMintAddressStr || "",
                transactionSignature: "",
                metadataUrl: "",
                imageUrl: finalImageUrl,
                recipientAddress: decryptedWalletAddress, 
                error: err.message,
            });
        }
    }

    const successes = individualNftResults.filter(r => !r.error && r.mintAddress).length;
    const failures = individualNftResults.length - successes;
    console.log(`NFTs processed for ${ghosts.length} inputs. Success: ${successes}, Fail: ${failures}`);

    return individualNftResults;
}