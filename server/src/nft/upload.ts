import { generateSigner, none, percentAmount, publicKey, Signer, some, Umi } from "@metaplex-foundation/umi";
import { MetaDataInput } from "./types";
import { createNft, createProgrammableNft, Creator, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { createTransferRuleSet } from "./ruleset/createLimitedTransferRuleSet";
import { randomUUID } from "crypto";

interface MintResult {
    mintSigner: Signer;
    signature: Uint8Array;
    tokenStandard: TokenStandard;
}

export async function uploadNft(
    umi: Umi,
    metaData: MetaDataInput,
    metadataUrl: string,
    onChainCreators: Creator[],
    unchangable: boolean = false,
    tokenStandard: TokenStandard,
    allowedWallets: string[] | undefined,
): Promise<MintResult> {
    const mintSigner: Signer = generateSigner(umi);

    let txBuilder = null;

    if(allowedWallets) {
        // const ruleSetPda = await createRestrictedTransferRuleSet(umi, allowedWallets);

        const allowedWallets = [
            'DhYCi6pvfhJkPRpt5RjYwsE1hZw84iu6twbRt9B6dYLV',
            '6twkdkDaF3xANuvpUQvENSLhtNmPxzYAEu8qUKcVkWwy',
          ]
          
        const ruleSetPda = await createTransferRuleSet(umi, "fhg", allowedWallets)
        // console.log(ruleSetPda)
        const nftInputArgs = {
            mint: mintSigner,
            authority: umi.identity,
            name: metaData.name,
            uri: metadataUrl,
            sellerFeeBasisPoints: percentAmount(metaData.sellerFeeBasisPoints / 100, 2),
            creators: some(onChainCreators),
            isMutable: !unchangable,
            collection: metaData.collection ? some(publicKey(metaData.collection.key)) : none(),
            tokenStandard,
            ruleSet: ruleSetPda[0],
            plugins: [
                {
                    type: "ProgramAllowList",

                }
            ]
        };

        txBuilder = createProgrammableNft(umi, nftInputArgs as any);
    } else {
        const nftInputArgs = {
            mint: mintSigner,
            authority: umi.identity,
            name: metaData.name,
            uri: metadataUrl,
            sellerFeeBasisPoints: percentAmount(metaData.sellerFeeBasisPoints / 100, 2),
            creators: some(onChainCreators),
            isMutable: !unchangable,
            collection: metaData.collection ? some(publicKey(metaData.collection.key)) : none(),
            tokenStandard,
        };
    
        txBuilder = createNft(umi, nftInputArgs as any);
    }

    if(txBuilder) {
        try {
            const { signature } = await txBuilder.sendAndConfirm(umi, {
                confirm: { commitment: "confirmed" },
            });
    
            return { mintSigner, signature, tokenStandard };
    
        } catch (error) {
            throw error;
        }
    } else {
        throw new Error("Error creating nft")
    }
}