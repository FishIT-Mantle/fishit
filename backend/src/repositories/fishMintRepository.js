import { query } from '../config/database.js';

/**
 * Repository for fish_mints table operations
 */

/**
 * Create a new fish mint record from FishCaught event
 */
export async function createFishMint(data) {
  const {
    tokenId,
    userAddress,
    tier,
    zone,
    baitType,
    randomWord,
    mintTxHash
  } = data;

  const sql = `
    INSERT INTO fish_mints (
      token_id, user_address, tier, zone, bait_type, 
      random_word, status, mint_tx_hash
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
    ON CONFLICT (token_id) DO NOTHING
    RETURNING *
  `;

  const result = await query(sql, [
    tokenId,
    userAddress,
    tier,
    zone,
    baitType,
    randomWord,
    mintTxHash
  ]);

  return result.rows[0];
}

/**
 * Get fish mint by token ID
 */
export async function getFishMintByTokenId(tokenId) {
  const sql = 'SELECT * FROM fish_mints WHERE token_id = $1';
  const result = await query(sql, [tokenId]);
  return result.rows[0];
}

/**
 * Update fish mint status
 */
export async function updateStatus(tokenId, status, errorMessage = null) {
  const sql = `
    UPDATE fish_mints 
    SET status = $2, 
        error_message = $3,
        updated_at = NOW()
    WHERE token_id = $1
    RETURNING *
  `;
  const result = await query(sql, [tokenId, status, errorMessage]);
  return result.rows[0];
}

/**
 * Save generated image (base64)
 */
export async function saveGeneratedImage(tokenId, imageBase64) {
  const sql = `
    UPDATE fish_mints 
    SET image_base64 = $2,
        status = 'generated',
        updated_at = NOW()
    WHERE token_id = $1
    RETURNING *
  `;
  const result = await query(sql, [tokenId, imageBase64]);
  return result.rows[0];
}

/**
 * Save IPFS metadata after upload
 */
export async function saveIPFSMetadata(tokenId, ipfsData) {
  const { imageCid, metadataCid, metadataUrl } = ipfsData;
  
  const sql = `
    UPDATE fish_mints 
    SET ipfs_image_cid = $2,
        ipfs_metadata_cid = $3,
        ipfs_metadata_url = $4,
        image_base64 = NULL,  -- Clear base64 to save space
        status = 'uploaded',
        updated_at = NOW()
    WHERE token_id = $1
    RETURNING *
  `;
  
  const result = await query(sql, [tokenId, imageCid, metadataCid, metadataUrl]);
  return result.rows[0];
}

/**
 * Mark mint as finalized (setTokenURI called)
 */
export async function markFinalized(tokenId, finalizeTxHash) {
  const sql = `
    UPDATE fish_mints 
    SET status = 'completed',
        finalize_tx_hash = $2,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE token_id = $1
    RETURNING *
  `;
  const result = await query(sql, [tokenId, finalizeTxHash]);
  return result.rows[0];
}

/**
 * Increment retry count
 */
export async function incrementRetry(tokenId) {
  const sql = `
    UPDATE fish_mints 
    SET retry_count = retry_count + 1,
        updated_at = NOW()
    WHERE token_id = $1
    RETURNING *
  `;
  const result = await query(sql, [tokenId]);
  return result.rows[0];
}

/**
 * Get all pending mints (for retry worker)
 */
export async function getPendingMints(maxRetries = 5) {
  const sql = `
    SELECT * FROM fish_mints 
    WHERE status IN ('pending', 'generating', 'generated', 'uploading', 'uploaded', 'failed')
    AND retry_count < $1
    AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at ASC
  `;
  const result = await query(sql, [maxRetries]);
  return result.rows;
}

/**
 * Get mints by status
 */
export async function getMintsByStatus(status) {
  const sql = 'SELECT * FROM fish_mints WHERE status = $1 ORDER BY created_at DESC LIMIT 100';
  const result = await query(sql, [status]);
  return result.rows;
}

/**
 * Get user's recent mints
 */
export async function getUserMints(userAddress, limit = 10) {
  const sql = `
    SELECT * FROM fish_mints 
    WHERE user_address = $1 
    ORDER BY created_at DESC 
    LIMIT $2
  `;
  const result = await query(sql, [userAddress.toLowerCase(), limit]);
  return result.rows;
}

/**
 * Get statistics
 */
export async function getStats() {
  const sql = `
    SELECT 
      status,
      tier,
      COUNT(*) as count
    FROM fish_mints
    GROUP BY status, tier
    ORDER BY status, tier
  `;
  const result = await query(sql);
  return result.rows;
}

export default {
  createFishMint,
  getFishMintByTokenId,
  updateStatus,
  saveGeneratedImage,
  saveIPFSMetadata,
  markFinalized,
  incrementRetry,
  getPendingMints,
  getMintsByStatus,
  getUserMints,
  getStats
};