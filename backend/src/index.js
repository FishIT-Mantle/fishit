import dotenv from 'dotenv';
import * as blockchain from './services/blockchainService.js';
import * as imageGenerator from './services/imageGenerator.js';
import * as ipfsUploader from './services/ipfsUploader.js';
import * as mintProcessor from './services/mintProcessor.js';
import * as retryWorker from './workers/retryWorker.js';
import db from './config/database.js';

dotenv.config();

/**
 * FishIt Backend Service
 * 
 * Handles AI image generation, IPFS upload, and NFT metadata finalization
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🐟 FishIt Backend Service                                  ║
║   AI Image Generation & IPFS Upload for Mantle               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

/**
 * Initialize all services
 */
async function initialize() {
  try {
    console.log('⚙️  Initializing services...\n');

    // 1. Validate environment variables
    validateEnvironment();

    // 2. Initialize blockchain
    blockchain.initialize();

    // 3. Validate Gemini AI
    imageGenerator.validateConfig();

    // 4. Validate Pinata IPFS
    await ipfsUploader.validateConfig();

    // 5. Check database connection
    await db.query('SELECT NOW()');
    console.log('✅ Database connected');

    // 6. Check backend signer authorization
    const isAuthorized = await blockchain.checkAuthorization();
    if (!isAuthorized) {
      console.warn('\n⚠️  WARNING: Backend signer not authorized!');
      console.warn('   Please run: FishNFT.setBackendSigner(backendSignerAddress)');
      console.warn('   Continuing anyway...\n');
    }

    console.log('\n✅ All services initialized successfully!\n');

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

/**
 * Start the main application
 */
async function start() {
  try {
    await initialize();

    // Start listening to FishCaught events
    console.log('🎣 Starting event listener...\n');
    blockchain.listenToFishCaughtEvents(async (eventData) => {
      try {
        await mintProcessor.processMint(eventData);
      } catch (error) {
        console.error('Error processing event:', error);
      }
    });

    // Start retry worker
    console.log('🔁 Starting retry worker...\n');
    retryWorker.start();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Backend is now running and listening for events!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Startup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = [
    'RPC_URL',
    'FISH_NFT_ADDRESS',
    'FISHING_GAME_ADDRESS',
    'BACKEND_SIGNER_PRIVATE_KEY',
    'GEMINI_API_KEY',
    'PINATA_API_KEY',
    'PINATA_SECRET_KEY',
    'DATABASE_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Environment variables validated');
}

/**
 * Graceful shutdown handler
 */
async function shutdown() {
  console.log('\n\n🛑 Shutting down gracefully...');

  try {
    // Close database connections
    await db.close();
    console.log('✅ Database connections closed');

    console.log('👋 Goodbye!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  shutdown();
});

// Start the application
start();