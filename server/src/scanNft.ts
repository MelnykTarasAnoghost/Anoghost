import { decryptTimelessGhostId, tryDecryptWithRotation } from "./ghostIdManager"; 
import { Umi, publicKey, PublicKey } from "@metaplex-foundation/umi";
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";

interface NftAttribute {
    trait_type: string;
    value: string; 
}

interface NftMetadata {
    name: string;
    description: string;
    image: string;
    attributes: NftAttribute[];
}

export type NftAccessStatus = { status: "success" | "illegal-owner" | "invalid-room" | "server-error" | "nft-not-found" | "nft-invalid-structure" | "metadata-fetch-error", roomId?: string};

async function fetchNftMetadata(nftIdentifier: string, umi: Umi): Promise<NftMetadata | null> {
    console.log(`Fetching REAL NFT metadata for mint: ${nftIdentifier}`);
    try {
        const mint = publicKey(nftIdentifier);
        const asset = await fetchDigitalAsset(umi, mint);

        if (!asset || !asset.metadata || !asset.metadata.uri) {
            console.warn(`Metadata URI not found for NFT: ${nftIdentifier}`);
            return null;
        }

        if (asset.metadata.uri.trim() === "") {
            console.warn(`Metadata URI is empty for NFT: ${nftIdentifier}`);
            return null;
        }
        
        console.log(`Fetching JSON from URI: ${asset.metadata.uri}`);
        const response = await fetch(asset.metadata.uri);

        if (!response.ok) {
            console.error(`Failed to fetch metadata from URI ${asset.metadata.uri}. Status: ${response.status}`);
            return null;
        }

        const jsonMetadata = await response.json();

        if (typeof jsonMetadata === 'object' && jsonMetadata !== null && 'name' in jsonMetadata && 'attributes' in jsonMetadata) {
            return jsonMetadata as NftMetadata;
        } else {
            console.error(`Fetched JSON from ${asset.metadata.uri} does not conform to NftMetadata structure.`);
            return null;
        }

    } catch (error: any) {
        console.error(`Error fetching or parsing metadata for NFT ${nftIdentifier}: ${error.message}`);
        if (error.name === 'RpcError' && error.message.includes('Account does not exist')) {
             console.warn(`NFT account not found on-chain: ${nftIdentifier}`);
        }
        return null;
    }
}

export async function scanNftForAccess(
    nftIdentifier: string,
    currentUserWalletAddress: string,
    masterSecret: string,
    umi: Umi
): Promise<NftAccessStatus> {
    console.log(`Scanning NFT ${nftIdentifier.substring(0,10)}... for user ${currentUserWalletAddress.substring(0,10)}...`);

    if (!masterSecret) {
        console.error("Master secret is not provided for scanNftForAccess.");
        return {status: "server-error"}; 
    }
    if (!umi) {
        console.error("Umi instance is not provided for scanNftForAccess.");
        return {status: "server-error"};
    }

    let metadata: NftMetadata | null;
    try {
        metadata = await fetchNftMetadata(nftIdentifier, umi);
    } catch (error: any) {
        console.error(`Unexpected error during metadata fetch for NFT ${nftIdentifier}: ${error.message}`);
        return {status: "metadata-fetch-error" }; 
    }

    if (!metadata) {
        console.warn(`NFT metadata not found or failed to fetch for identifier: ${nftIdentifier}`);
        return {status: "nft-not-found" };
    }

    console.log(metadata)

    const ghostAttribute = metadata.attributes.find(attr => attr.trait_type === "ghost");
    if (!ghostAttribute || !ghostAttribute.value) {
        console.warn(`'ghost' attribute not found or empty in NFT metadata for ${nftIdentifier}`);
        return {status: "nft-invalid-structure"}; 
    }

    let intendedRecipientWalletAddress: string;
    try {
        intendedRecipientWalletAddress = decryptTimelessGhostId(ghostAttribute.value, masterSecret);
    } catch (error: any) {
        console.error(`Failed to decrypt ghostId for NFT ${nftIdentifier}: ${error.message}`);
        return {status: "nft-invalid-structure"}; 
    }

    if (intendedRecipientWalletAddress.toLowerCase() !== currentUserWalletAddress.toLowerCase()) {
        console.warn(`Wallet address mismatch for NFT ${nftIdentifier}. Expected: ${intendedRecipientWalletAddress}, Got: ${currentUserWalletAddress}`);
        return {status: "illegal-owner" };
    }

    const roomIdAttribute = metadata.attributes.find(attr => attr.trait_type === "room_id_encrypted");
    if (!roomIdAttribute || !roomIdAttribute.value) {
        console.warn(`'room_id_encrypted' attribute not found or empty in NFT metadata for ${nftIdentifier}`);
        return {status: "invalid-room" }; 
    }

    let decryptedRoomId: string;
    try {
        decryptedRoomId = decryptTimelessGhostId(roomIdAttribute.value, masterSecret);
    } catch (error: any) {
        console.error(`Failed to decrypt room ID for NFT ${nftIdentifier}: ${error.message}`);
        return {status: "invalid-room" }; 
    }

    console.log(`Access GRANTED for user ${currentUserWalletAddress.substring(0,10)}... to room ${decryptedRoomId} via NFT ${nftIdentifier.substring(0,10)}...`);
    return {status: "success", roomId: decryptedRoomId };
}
