import pinataSDK from '@pinata/sdk';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

/**
 * IPFS Uploader Service using Pinata
 * Handles uploading images and metadata JSON
 */

let pinata;

try {
    pinata = new pinataSDK(
        process.env.PINATA_API_KEY,
        process.env.PINATA_SECRET_KEY
    );
} catch (error) {
    console.error("Pinata SDK Error:", error);
}

/**
 * Upload image and metadata to IPFS
 * @param {string} base64Image - Raw base64 image string
 * @param {Object} fishMint - Fish mint data object
 * @returns {Promise<string>} IPFS URL of the metadata (tokenURI)
 */
export async function uploadComplete(base64Image, fishMint) {
    try {
        const { token_id } = fishMint;
        
        // 1. Upload Image
        const imageCid = await uploadImage(base64Image, token_id);
        const imageUrl = `ipfs://${imageCid}`;
        
        // 2. Upload Metadata
        const metadataCid = await uploadMetadata(fishMint, imageUrl);
        return `ipfs://${metadataCid}`;

    } catch (error) {
        console.error(`❌ Complete upload failed:`, error.message);
        throw error;
    }
}

/**
 * Upload base64 image to Pinata
 */
export async function uploadImage(base64Image, tokenId) {
    try {
        console.log(`📤 Uploading image for token ${tokenId} to IPFS...`);

        // Convert Base64 to Buffer
        const buffer = Buffer.from(base64Image, 'base64');
        
        // Create a Readable Stream from the buffer (This fixes your error)
        const stream = Readable.from(buffer);
        
        // Hack: Add a path property so Pinata knows the filename
        stream.path = `fish-${tokenId}.png`;

        const options = {
            pinataMetadata: {
                name: `FishIt-Img-${tokenId}`
            }
        };

        const result = await pinata.pinFileToIPFS(stream, options);
        console.log(`✅ Image uploaded: ${result.IpfsHash}`);
        
        return result.IpfsHash;

    } catch (error) {
        console.error(`❌ Image upload failed for token ${tokenId}:`, error.message);
        throw error;
    }
}

/**
 * Generate and upload JSON metadata
 */
export async function uploadMetadata(fishMint, imageUrl) {
    try {
        const { token_id, tier, zone, bait_type, random_word } = fishMint;
        
        const metadata = {
            name: `${tier} Fish #${token_id}`,
            description: `A ${tier} fish caught in the ${zone} zone using ${bait_type} bait.`,
            image: imageUrl,
            attributes: [
                { trait_type: "Tier", value: tier },
                { trait_type: "Zone", value: zone },
                { trait_type: "Bait", value: bait_type },
                { trait_type: "Seed", value: random_word }
            ]
        };

        const options = {
            pinataMetadata: {
                name: `FishIt-Meta-${token_id}`
            }
        };

        const result = await pinata.pinJSONToIPFS(metadata, options);
        console.log(`✅ Metadata uploaded: ${result.IpfsHash}`);
        
        return result.IpfsHash;

    } catch (error) {
        console.error(`❌ Metadata upload failed:`, error.message);
        throw error;
    }
}

export async function validateConfig() {
    try {
        const result = await pinata.testAuthentication();
        if(result.authenticated) {
            console.log('✅ Pinata configured and authenticated');
        } else {
            throw new Error('Pinata authentication failed');
        }
    } catch (error) {
        throw new Error(`Pinata Error: ${error.message}`);
    }
}

export default {
    uploadComplete,
    validateConfig
};