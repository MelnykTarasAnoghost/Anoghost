import { createGenericFile, Umi } from "@metaplex-foundation/umi";
import { MetaDataInput } from "../../types";

interface ImageUploadResult {
    finalImageUrl: string;
    imageContentType: string;
}

export async function handleImageUpload(umi: Umi, metaData: MetaDataInput): Promise<ImageUploadResult> {
    let finalImageUrl: string;
    let imageContentType: string = 'image/png'; 

    if (metaData.imageFile) {
        let imageBuffer: Buffer;
        let imageName: string;

        if (metaData.imageFile instanceof Buffer) {
            imageBuffer = metaData.imageFile;
            imageName = 'nft-image';
            imageContentType = 'image/png';
        } else if (typeof (metaData.imageFile as File).arrayBuffer === 'function') {
            const file = metaData.imageFile as File;
            imageBuffer = Buffer.from(await file.arrayBuffer());
            imageName = file.name || 'nft-image';
            imageContentType = file.type || 'image/png';
        } else {
            throw new Error("metaData.imageFile must be a Buffer or a File object.");
        }

        const umiImageFile = createGenericFile(imageBuffer, imageName, { contentType: imageContentType });

        try {
            const [uploadedUri] = await umi.uploader.upload([umiImageFile]);
            finalImageUrl = uploadedUri;
        } catch (error) {
            throw new Error(`Failed to upload image to Irys: ${(error as Error).message}`);
        }
    } else if (metaData.imageUri) {
        finalImageUrl = metaData.imageUri;
        imageContentType = metaData.properties.files?.find(f => f.uri === finalImageUrl)?.type || 'application/octet-stream';
    } else {
        throw new Error("No image source (file or URI) was processed.");
    }

    return { finalImageUrl, imageContentType };
}