-- FishIt Backend Database Schema
-- PostgreSQL 14+

-- Fish mints tracking table
CREATE TABLE fish_mints (
  -- Primary identifiers
  token_id BIGINT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  
  -- Fish properties (from event)
  tier VARCHAR(20) NOT NULL,        -- Junk, Common, Rare, Epic, Legendary
  zone VARCHAR(20) NOT NULL,         -- Shallow, Reef, DeepSea, Abyssal
  bait_type VARCHAR(20) NOT NULL,    -- Common, Rare, Epic
  random_word VARCHAR(78),           -- VRF random number (hex string)
  
  -- Processing state machine
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Status values:
  --   pending: Event received, not processed
  --   generating: AI image generation in progress
  --   generated: Image generated, not uploaded
  --   uploading: IPFS upload in progress
  --   uploaded: IPFS complete, waiting for blockchain call
  --   finalizing: setTokenURI transaction sent
  --   completed: Fully processed
  --   failed: Processing failed (see error_message)
  
  error_message TEXT,                -- Error details if failed
  retry_count INTEGER DEFAULT 0,     -- Number of retry attempts
  
  -- Generated data
  image_base64 TEXT,                 -- Temporary storage (cleared after upload)
  ipfs_image_cid VARCHAR(100),       -- IPFS CID for image
  ipfs_metadata_cid VARCHAR(100),    -- IPFS CID for metadata
  ipfs_metadata_url TEXT,            -- Full IPFS URL (ipfs://...)
  
  -- Blockchain transactions
  mint_tx_hash VARCHAR(66),          -- Transaction hash of original mint
  finalize_tx_hash VARCHAR(66),      -- Transaction hash of setTokenURI call
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_tier CHECK (tier IN ('Junk', 'Common', 'Rare', 'Epic', 'Legendary')),
  CONSTRAINT valid_zone CHECK (zone IN ('Shallow', 'Reef', 'DeepSea', 'Abyssal')),
  CONSTRAINT valid_bait CHECK (bait_type IN ('Common', 'Rare', 'Epic')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'generating', 'generated', 'uploading', 'uploaded', 'finalizing', 'completed', 'failed'))
);

-- Indexes for efficient queries
CREATE INDEX idx_status ON fish_mints(status);
CREATE INDEX idx_user ON fish_mints(user_address);
CREATE INDEX idx_created_at ON fish_mints(created_at);
CREATE INDEX idx_tier ON fish_mints(tier);
CREATE INDEX idx_status_created ON fish_mints(status, created_at); -- For retry queries

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_fish_mints_updated_at 
  BEFORE UPDATE ON fish_mints 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Analytics view (optional, useful for monitoring)
CREATE OR REPLACE VIEW fish_stats AS
SELECT
  tier,
  zone,
  bait_type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_processing_time_seconds
FROM fish_mints
GROUP BY tier, zone, bait_type, status;

-- Comments for documentation
COMMENT ON TABLE fish_mints IS 'Tracks all fish NFT mints from event to completion';
COMMENT ON COLUMN fish_mints.token_id IS 'NFT token ID from FishNFT contract';
COMMENT ON COLUMN fish_mints.status IS 'Current processing state of the mint';
COMMENT ON COLUMN fish_mints.retry_count IS 'Number of retry attempts (max 5 before marking failed)';
COMMENT ON COLUMN fish_mints.image_base64 IS 'Temporary base64 image storage, cleared after IPFS upload';