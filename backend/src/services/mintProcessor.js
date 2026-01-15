import * as fishMintRepo from '../repositories/fishMintRepository.js';
import * as imageGenerator from './imageGenerator.js';
import * as ipfsUploader from './ipfsUploader.js';
import * as blockchain from './blockchainService.js';

const MAX_RETRIES = Number(process.env.MAX_RETRY_ATTEMPTS) || 5;

export async function processMint(eventData) {
  // Handle both Event (camelCase) and DB (snake_case)
  const tokenId = eventData.tokenId || eventData.token_id;
  
  if (!tokenId) {
    console.error("❌ SKIPPING: processMint received data without an ID");
    return;
  }

  try {
    console.log(`\n🔄 Processing mint for token ${tokenId}...`);

    // 1. Get or Create Record
    let fishMint = await fishMintRepo.getFishMintByTokenId(tokenId);

    if (!fishMint) {
      console.log(`📝 Creating new fish mint record...`);
      const mintData = {
        tokenId: tokenId,
        userAddress: eventData.userAddress || eventData.user_address,
        tier: eventData.tier,
        zone: eventData.zone,
        baitType: eventData.baitType || eventData.bait_type,
        randomWord: eventData.randomWord || eventData.random_word,
        mintTxHash: eventData.mintTxHash || eventData.mint_tx_hash
      };
      fishMint = await fishMintRepo.createFishMint(mintData);
    }

    if (fishMint.status === 'completed') {
      console.log(`✅ Token ${tokenId} already completed, skipping...`);
      return;
    }

    // 2. Generate Image
    if (!fishMint.image_base64 && fishMint.status !== 'generated' && fishMint.status !== 'uploaded') {
      await generateImage(fishMint);
      fishMint = await fishMintRepo.getFishMintByTokenId(tokenId); // Reload
    }

    // 3. Upload to IPFS
    let activeMetadataUrl = fishMint.ipfs_metadata_url;

    if ((fishMint.image_base64 || fishMint.status === 'generated') && !activeMetadataUrl) {
      activeMetadataUrl = await uploadToIPFS(fishMint);
      fishMint.ipfs_metadata_url = activeMetadataUrl; 
    }

    // 4. Finalize On-Chain
    // ✅ FIX: Check if we have a URL AND status is not completed
    // Don't check for 'uploaded' status - that's just a status, not completion
    if (activeMetadataUrl) {
      if (fishMint.status === 'completed') {
        console.log(`✅ Token ${tokenId} already finalized on-chain`);
      } else {
        await finalizeOnChain(fishMint, activeMetadataUrl);
      }
    } else {
      console.log(`⚠️  Token ${tokenId} has no metadata URL, skipping finalization`);
    }

    console.log(`✅ Token ${tokenId} processing complete!`);

  } catch (error) {
    console.error(`❌ Error processing token ${tokenId}:`, error.message);
    await fishMintRepo.updateStatus(tokenId, 'failed', error.message);
  }
}

async function generateImage(fishMint) {
  const { token_id, tier, zone, random_word } = fishMint;
  try {
    console.log(`🎨 Generating image for token ${token_id}...`);
    await fishMintRepo.updateStatus(token_id, 'generating');
    const seed = BigInt(random_word || 12345) % 1000000n;
    const base64Image = await imageGenerator.generateFishImage(tier, zone, Number(seed));
    await fishMintRepo.saveGeneratedImage(token_id, base64Image);
    console.log(`✅ Image generated for token ${token_id}`);
  } catch (error) {
    console.error(`❌ Image generation failed:`, error.message);
    throw error;
  }
}

async function uploadToIPFS(fishMint) {
  const { token_id, image_base64 } = fishMint;
  try {
    console.log(`📤 Uploading to IPFS for token ${token_id}...`);
    await fishMintRepo.updateStatus(token_id, 'uploading');
    
    const ipfsData = await ipfsUploader.uploadComplete(image_base64, fishMint);
    console.log(`   📦 IPFS Data received:`, ipfsData);
    
    const savedData = await fishMintRepo.saveIPFSMetadata(token_id, ipfsData);
    console.log(`   💾 Saved to DB:`, savedData);
    
    console.log(`✅ IPFS upload complete for token ${token_id}`);
    console.log(`   🔗 Metadata URL: ${ipfsData.metadataUrl}`);
    
    return ipfsData.metadataUrl;
  } catch (error) {
    console.error(`❌ IPFS upload failed:`, error.message);
    throw error;
  }
}

async function finalizeOnChain(fishMint, urlOverride) {
  const { token_id } = fishMint;
  const urlToUse = urlOverride || fishMint.ipfs_metadata_url;

  try {
    console.log(`⛓️  Finalizing on-chain for token ${token_id}...`);
    console.log(`   Using URL: ${urlToUse}`);
    await fishMintRepo.updateStatus(token_id, 'finalizing');
    
    const txHash = await blockchain.setTokenURI(token_id, urlToUse);
    
    console.log(`   ✅ Transaction sent: ${txHash}`);
    await fishMintRepo.markFinalized(token_id, txHash);
    console.log(`✅ On-chain finalization complete for token ${token_id}`);
  } catch (error) {
    console.error(`❌ On-chain finalization failed:`, error.message);
    throw error;
  }
}

export async function processMintBatch(mints, concurrency = 3) {
  console.log(`\n🔄 Processing batch of ${mints.length} mints...`);
  const promises = [];
  for (let i = 0; i < mints.length; i += concurrency) {
    const batch = mints.slice(i, i + concurrency);
    promises.push(...batch.map(mint => processMint(mint)));
  }
  await Promise.all(promises);
  console.log(`✅ Batch processing complete`);
}

export default { processMint, processMintBatch };