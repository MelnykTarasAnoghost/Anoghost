import { Umi, PublicKey } from "@metaplex-foundation/umi";
import { TokenStandard, Creator as MetaplexCreator } from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";
import { initializeUmi } from './nft/umi/initialize-umi';
import { uploadMetadata } from './nft/upload/metadata/upload';
import { uploadNft } from './nft/upload';
import { confirmAssetCreation } from './nft/confirm-creation';
import { transferNft } from "./nft/transfer-nft";

import {
    CreateNftServiceInput,
    CreateNftServiceOutput as SingleNftOutput,
} from "./nft/types";

interface ExtendedCreateNftServiceOutput extends SingleNftOutput {
    recipientAddress?: string;
    error?: string;
}

export async function createNftService({
    metaData,
    recipients,
    rpcUrl,
    irysUrl,
    appKeyPair,
    unchangable = false,
}: CreateNftServiceInput): Promise<ExtendedCreateNftServiceOutput[]> {
    if (!metaData.imageUri) {
        throw new Error("metaData.imageUri must be provided.");
    }

    const finalImageUrl = metaData.imageUri;

    if (!recipients || recipients.length === 0) {
        throw new Error("There must be at least one participant");
    }

    const umi: Umi = initializeUmi(rpcUrl, irysUrl, appKeyPair);

    const individualNftResults: ExtendedCreateNftServiceOutput[] = [];

    for (const recipientPublicKey of recipients) {
        const recipientWalletAddress = recipientPublicKey.toString();
        let currentMintAddressStr = "";

        try {
            const participantMetaData = JSON.parse(JSON.stringify(metaData));

            const ghostAttribute = {
                trait_type: "ghost",
                value: recipientWalletAddress,
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
                [process.env.SERVER_PUBLIC_KEY!, "tvw6P8rpgvrMrXJpD8wEhmV8cZHE92PCuX8Fsw2bCPj"]
            );

            const newMintAddress = mintSigner.publicKey;
            currentMintAddressStr = newMintAddress.toString();

            const asset = await confirmAssetCreation(umi, newMintAddress);
            if (!asset) {
                throw new Error(`Asset not found ${currentMintAddressStr} intended for ${recipientWalletAddress}.`);
            }

            await transferNft({
                umi: umi,
                mint: newMintAddress,
                newOwner: recipientPublicKey,
                tokenStandard: mintedTokenStandard,
            });

            individualNftResults.push({
                mintAddress: currentMintAddressStr,
                transactionSignature: signature ? bs58.encode(signature) : "",
                metadataUrl: metadataJsonUrl,
                imageUrl: finalImageUrl,
                recipientAddress: recipientWalletAddress,
            });

        } catch (error) {
            const err = error as Error & { logs?: string[] };
            console.error(`Error processing NFT for participant ${recipientWalletAddress} (Mint: ${currentMintAddressStr || 'N/A'}): ${err.message}`);
            if (err.logs) {
                console.error("Transactions:");
                err.logs.forEach(log => console.error(log));
            }
            individualNftResults.push({
                mintAddress: currentMintAddressStr || "",
                transactionSignature: "",
                metadataUrl: "",
                imageUrl: finalImageUrl,
                recipientAddress: recipientWalletAddress,
                error: err.message,
            });
        }
    }

    const successes = individualNftResults.filter(r => !r.error && r.mintAddress).length;
    const failures = individualNftResults.length - successes;
    console.log(`NFT creation process completed for ${recipients.length} participants. Successes: ${successes}, Failures: ${failures}`);

    return individualNftResults;
}