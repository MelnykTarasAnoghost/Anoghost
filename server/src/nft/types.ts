import { Keypair } from "@metaplex-foundation/umi";

export interface CreatorInput {
    address: string;
    share: number;
    verified?: boolean;
}

export interface FileProperty {
    uri?: string;
    type: string;
}

export interface PropertiesInput {
    files?: FileProperty[];
    category: "image" | "video" | "audio" | "vr" | "html" | string;
    creators: CreatorInput[];
}

export interface CollectionInput {
    key: string;
}

export interface AttributeInput {
    trait_type: string;
    value: string;
}

export interface MetaDataInput {
    name: string;
    description: string;
    imageFile?: Buffer | File;
    imageUri?: string;
    symbol: string;
    externalUri?: string;
    attributes?: AttributeInput[];
    collection?: CollectionInput;
    properties: PropertiesInput;
    sellerFeeBasisPoints: number;
}

export interface CreateNftServiceInput {
    metaData: MetaDataInput;
    recipients?: string[];
    rpcUrl: string;
    irysUrl: string;
    appKeyPair: Keypair;
    transferableWallets?: string[];
    unchangable?: boolean;
}

export interface CreateNftServiceOutput {
    mintAddress: string;
    transactionSignature: string;
    metadataUrl: string;
    imageUrl?: string;
}