import * as fishMintRepo from '../repositories/fishMintRepository.js';
import * as imageGenerator from './imageGenerator.js';
import * as ipfsUploader from './ipfsUploader.js';
import * as blockchain from './blockchainService.js';

/**
 * Mint Processor
 * 
 * Main orchestrator for processing fish mints from event to completion
 */

const MAX_RETRIES = Number(process.env.MAX_RETRY_ATTEMPTS) || 5;

/**
 * Process a single fish mint through the entire pipeline
 * @param {Object} eventData - Data from FishCaught event
 */
export async function processMint(eventData) {
  const { tokenId } = eventData;

  try {
    console.log(`\n🔄 Processing mint for token ${tokenId}...`);

    // Step 1: Check if already in database
    let fishMint = await fishMintRepo.getFishMintByTokenId(tokenId);

    if (!fishMint) {
      // Create new record
      console.log(`📝 Creating new fish mint record...`);
      fishMint = await fishMintRepo.createFishMint(eventData);
      
      if (!fishMint) {
        console.log(`⚠️  Token ${tokenId} already exists, skipping...`);
        return;
      }
    }

    // Check if already completed
    if (fishMint.status === 'completed') {
      console.log(`✅ Token ${tokenId} already completed, skipping...`);
      return;
    }

    // Check retry limit
    if (fishMint.retry_count >= MAX_RETRIES) {
      console.log(`❌ Token ${tokenId} exceeded max retries (${MAX_RETRIES})`);
      await fishMintRepo.updateStatus(tokenId, 'failed', 'Max retries exceeded');
      return;
    }

    // Increment retry count
    await fishMintRepo.incrementRetry(tokenId);

    // Step 2: Generate image (if needed)
    if (!fishMint.image_base64 && fishMint.status !== 'generated') {
      await generateImage(fishMint);
      // Reload data
      fishMint = await fishMintRepo.getFishMintByTokenId(tokenId);
    }

    // Step 3: Upload to IPFS (if needed)
    if (fishMint.image_base64 && !fishMint.ipfs_metadata_url) {
      await uploadToIPFS(fishMint);
      // Reload data
      fishMint = await fishMintRepo.getFishMintByTokenId(tokenId);
    }

    // Step 4: Set tokenURI on blockchain (if needed)
    if (fishMint.ipfs_metadata_url && fishMint.status !== 'completed') {
      await finalizeOnChain(fishMint);
    }

    console.log(`✅ Token ${tokenId} processing complete!`);

  } catch (error) {
    console.error(`❌ Error processing token ${tokenId}:`, error.message);
    await fishMintRepo.updateStatus(tokenId, 'failed', error.message);
    throw error;
  }
}

/**
 * Step 2: Generate AI image
 */
async function generateImage(fishMint) {
  const { token_id, tier, zone, random_word } = fishMint;

  try {
    console.log(`🎨 Generating image for token ${token_id}...`);
    await fishMintRepo.updateStatus(token_id, 'generating');

    // Use random_word as seed for variation
    const seed = BigInt(random_word) % 1000000n;

    // Generate image
    const base64Image = await imageGenerator.generateFishImage(
      tier,
      zone,
      Number(seed)
    );

    // Save to database
    await fishMintRepo.saveGeneratedImage(token_id, base64Image);

    console.log(`✅ Image generated for token ${token_id}`);

  } catch (error) {
    console.error(`❌ Image generation failed for token ${token_id}:`, error.message);
    throw error;
  }
}

/**
 * Step 3: Upload to IPFS
 */
async function uploadToIPFS(fishMint) {
  const { token_id, image_base64 } = fishMint;

  try {
    console.log(`📤 Uploading to IPFS for token ${token_id}...`);
    await fishMintRepo.updateStatus(token_id, 'uploading');

    // Upload image + metadata
    const ipfsData = await ipfsUploader.uploadComplete(image_base64, fishMint);

    // Save to database
    await fishMintRepo.saveIPFSMetadata(token_id, ipfsData);

    console.log(`✅ IPFS upload complete for token ${token_id}`);

  } catch (error) {
    console.error(`❌ IPFS upload failed for token ${token_id}:`, error.message);
    throw error;
  }
}

/**
 * Step 4: Finalize on blockchain
 */
async function finalizeOnChain(fishMint) {
  const { token_id, ipfs_metadata_url } = fishMint;

  try {
    console.log(`⛓️  Finalizing on-chain for token ${token_id}...`);
    await fishMintRepo.updateStatus(token_id, 'finalizing');

    // Call setTokenURI
    const txHash = await blockchain.setTokenURI(token_id, ipfs_metadata_url);

    // Mark as completed
    await fishMintRepo.markFinalized(token_id, txHash);

    console.log(`✅ On-chain finalization complete for token ${token_id}`);

  } catch (error) {
    console.error(`❌ On-chain finalization failed for token ${token_id}:`, error.message);
    throw error;
  }
}

/**
 * Process multiple mints in parallel (with concurrency limit)
 */
export async function processMintBatch(mints, concurrency = 3) {
  console.log(`\n🔄 Processing batch of ${mints.length} mints (concurrency: ${concurrency})...`);

  const results = [];
  
  for (let i = 0; i < mints.length; i += concurrency) {
    const batch = mints.slice(i, i + concurrency);
    const promises = batch.map(mint => 
      processMint(mint).catch(err => {
        console.error(`Batch processing error for token ${mint.token_id}:`, err);
        return null; // Don't fail entire batch
      })
    );
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  console.log(`✅ Batch processing complete`);
  return results;
}

export default {
  processMint,
  processMintBatch
};