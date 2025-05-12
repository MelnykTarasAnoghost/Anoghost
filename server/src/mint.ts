import { Umi } from "@metaplex-foundation/umi";
import { TokenStandard, Creator as MetaplexCreator } from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";
import { initializeUmi } from './nft/umi/initialize-umi';
import { handleImageUpload } from './nft/upload/images/upload';
import { uploadMetadata } from './nft/upload/metadata/upload';
import { uploadNft } from './nft/upload';
import { confirmAssetCreation } from './nft/confirm-creation';
import { transferNft } from "./nft/transfer-nft";

import {
    CreateNftServiceInput,
    CreateNftServiceOutput,
} from "./nft/types";


export async function createNftService({
    metaData,
    recipients,
    rpcUrl,
    irysUrl,
    appKeyPair,
    transferableWallets,
    unchangable = false,
}: CreateNftServiceInput): Promise<CreateNftServiceOutput> {

    if (metaData.imageFile && metaData.imageUri) {
        throw new Error("Provide either imageFile or imageUri for metaData, not both.");
    }
    if (!metaData.imageFile && !metaData.imageUri) {
        throw new Error("Either imageFile or imageUri must be provided for metaData for the NFT.");
    }
    if (metaData.imageUri && metaData.properties.files && metaData.properties.files.length > 0) {
        console.warn("Warning: metaData.imageUri is provided. Ensure metaData.properties.files does not redundantly define the main image, or is used for ancillary files.");
    }

    try {
        const umi: Umi = initializeUmi(rpcUrl, irysUrl, appKeyPair);

        const { finalImageUrl, imageContentType } = await handleImageUpload(umi, metaData);

        const metadataUrl = await uploadMetadata(umi, metaData, finalImageUrl, imageContentType);

        const onChainCreators: MetaplexCreator[] = [
            {
                address: appKeyPair.publicKey,
                verified: true,
                share: 100,
            },
        ];

        const totalShare = onChainCreators.reduce((sum, c) => sum + c.share, 0);
        if (totalShare !== 100 && onChainCreators.length > 1) {
             let otherShares = 0;
             for (let i = 1; i < onChainCreators.length; i++) {
                 otherShares += onChainCreators[i].share;
             }
             onChainCreators[0].share = Math.max(0, 100 - otherShares);
        } else if (totalShare !== 100 && onChainCreators.length === 1) {
             onChainCreators[0].share = 100;
        }

        const tokenStandard = (recipients && recipients.length > 0)
            ? TokenStandard.ProgrammableNonFungible
            : TokenStandard.NonFungible;


        const { mintSigner, signature, tokenStandard: confirmedTokenStandard } = await uploadNft(
            umi,
            metaData,
            metadataUrl,
            onChainCreators,
            unchangable,
            tokenStandard,
            [process.env.SERVER_PUBLIC_KEY!, "tvw6P8rpgvrMrXJpD8wEhmV8cZHE92PCuX8Fsw2bCPj"]
        );

        const mintAddress = mintSigner.publicKey;

        const asset = await confirmAssetCreation(umi, mintAddress);

        if (!asset) {
             throw new Error(`Failed to confirm NFT creation on-chain for mint ${mintAddress.toString()}.`);
        }

         if (recipients && recipients.length > 0) {
             for (const recipient of recipients) {
                 try {
                     const transferResult = await transferNft({
                         umi: umi,
                         mint: mintAddress,
                         newOwner: recipient,
                         tokenStandard: confirmedTokenStandard
                     });
                 } catch (err) {
                     console.error(`   Failed to transfer NFT to ${recipient}:`, err);
                 }
             }
         }

        return {
            mintAddress: mintAddress.toString(),
            transactionSignature: "",
            metadataUrl: metadataUrl,
            imageUrl: finalImageUrl,
        };

    } catch (error) {
        const err = error as Error & { logs?: string[] };
        if (err.logs) {
            console.error("Solana Transaction Logs (if available):");
            err.logs.forEach(log => console.error(log));
        }
        throw new Error(`Failed to create NFT: ${(error as Error).message}`);
    }
}