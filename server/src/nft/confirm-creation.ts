import { DigitalAsset, fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey, Umi } from "@metaplex-foundation/umi";

export async function confirmAssetCreation(umi: Umi, mintPublicKey: PublicKey, maxAttempts: number = 10, delayMs: number = 3000): Promise<DigitalAsset | null> {
    let asset: DigitalAsset | null = null;
    let attempts = 0;

    while (!asset && attempts < maxAttempts) {
        try {
            asset = await fetchDigitalAsset(umi, mintPublicKey);
            return asset;
        } catch (error: any) {
            if (error.name === 'AccountNotFoundError' && attempts < maxAttempts - 1) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                return null;
            }
        }
    }

    return asset;
}