import cron from 'node-cron';
import * as fishMintRepo from '../repositories/fishMintRepository.js';
import * as mintProcessor from '../services/mintProcessor.js';

/**
 * Retry Worker
 * 
 * Periodically checks for failed/pending mints and retries them
 */

const RETRY_INTERVAL = process.env.RETRY_INTERVAL_MINUTES || 5;
const MAX_RETRIES = Number(process.env.MAX_RETRY_ATTEMPTS) || 5;
const CONCURRENCY = Number(process.env.MAX_CONCURRENT_GENERATIONS) || 3;

/**
 * Process all pending mints
 */
async function processPendingMints() {
  try {
    console.log(`\n🔁 Retry worker checking for pending mints...`);

    // Get all pending/failed mints
    const pendingMints = await fishMintRepo.getPendingMints(MAX_RETRIES);

    if (pendingMints.length === 0) {
      console.log('✅ No pending mints to process');
      return;
    }

    console.log(`📋 Found ${pendingMints.length} pending mints`);

    // Group by status for logging
    const statusCounts = pendingMints.reduce((acc, mint) => {
      acc[mint.status] = (acc[mint.status] || 0) + 1;
      return acc;
    }, {});

    console.log('   Status breakdown:', statusCounts);

    // Process batch with concurrency limit
    await mintProcessor.processMintBatch(pendingMints, CONCURRENCY);

    console.log(`✅ Retry worker cycle complete\n`);

  } catch (error) {
    console.error('❌ Retry worker error:', error);
  }
}

/**
 * Start retry worker cron job
 */
export function start() {
  console.log(`🔁 Starting retry worker (interval: every ${RETRY_INTERVAL} minutes)...`);

  // Run immediately on startup
  processPendingMints();

  // Then run on schedule
  const schedule = `*/${RETRY_INTERVAL} * * * *`; // Every N minutes

  cron.schedule(schedule, async () => {
    await processPendingMints();
  });

  console.log('✅ Retry worker started');
}

/**
 * Manual trigger (for testing)
 */
export async function trigger() {
  console.log('🔁 Manually triggering retry worker...');
  await processPendingMints();
}

export default {
  start,
  trigger,
  processPendingMints
};