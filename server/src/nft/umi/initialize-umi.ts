import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { Keypair, keypairIdentity, Umi } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

export function initializeUmi(rpcUrl: string, irysUrl: string, appKeyPair: Keypair): Umi {
    return createUmi(rpcUrl)
        .use(mplTokenMetadata())
        .use(keypairIdentity(appKeyPair))
        .use(irysUploader({ address: irysUrl }));
}