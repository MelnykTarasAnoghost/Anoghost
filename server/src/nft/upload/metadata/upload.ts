import { Umi } from '@metaplex-foundation/umi';
import { FileProperty, MetaDataInput } from '../../types';

export async function uploadMetadata(
    umi: Umi,
    metaData: MetaDataInput,
    finalImageUrl: string,
    imageContentType: string
): Promise<string> {

    let metadataPropertiesFiles: FileProperty[] = [];

    if (finalImageUrl) {
        metadataPropertiesFiles.push({ uri: finalImageUrl, type: imageContentType });
    }

    if (metaData.properties?.files) {
        metaData.properties.files.forEach(fileProp => {
            if (fileProp.uri && fileProp.uri !== finalImageUrl) {
                metadataPropertiesFiles.push({ uri: fileProp.uri, type: fileProp.type });
            } else if (!fileProp.uri) {
            }
        });
    }

    const uniqueMetadataFiles = metadataPropertiesFiles.filter((file, index, self) =>
        index === self.findIndex((f) => f.uri === file.uri)
    );

    const offChainMetadataJson = {
        name: metaData.name,
        symbol: metaData.symbol,
        description: metaData.description,
        seller_fee_basis_points: metaData.sellerFeeBasisPoints,
        image: finalImageUrl,
        external_url: metaData.externalUri || "",
        attributes: metaData.attributes || [],
        collection: metaData.collection ? {
            name: metaData.collection.key,
            family: metaData.collection.key,
        } : undefined,
        properties: {
            files: uniqueMetadataFiles,
            category: metaData.properties.category,
            creators: metaData.properties.creators.map(c => ({
                address: c.address,
                share: c.share,
            })),
        },
    };

    try {
        const metadataUrl = await umi.uploader.uploadJson(offChainMetadataJson);
        return metadataUrl;
    } catch (error) {
        throw new Error(`Failed to upload metadata: ${(error as Error).message}`);
    }
}