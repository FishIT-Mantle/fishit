import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Blockchain Service for Mantle Network
 * 
 * Handles event listening and contract interactions
 */

// Load ABIs directly from smartcontract/abi (single source of truth)
const abiPath = path.join(__dirname, '../../../smartcontract/abi');
const FISH_NFT_ABI = JSON.parse(
    fs.readFileSync(path.join(abiPath, 'FishNFT.json'), 'utf8')
).abi;

const FISHING_GAME_ABI = JSON.parse(
    fs.readFileSync(path.join(abiPath, 'FishingGame.json'), 'utf8')
).abi;

// Initialize provider and signer
let provider;
let signer;
let fishNFTContract;
let fishingGameContract;

/**
 * Initialize blockchain connection
 */
export function initialize() {
    try {
        // Setup provider
        provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

        // Setup signer (backend wallet)
        const privateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('BACKEND_SIGNER_PRIVATE_KEY not configured');
        }
        signer = new ethers.Wallet(privateKey, provider);

        // Initialize contracts
        fishNFTContract = new ethers.Contract(
            process.env.FISH_NFT_ADDRESS,
            FISH_NFT_ABI,
            signer
        );

        fishingGameContract = new ethers.Contract(
            process.env.FISHING_GAME_ADDRESS,
            FISHING_GAME_ABI,
            provider // Read-only for events
        );

        console.log('✅ Blockchain initialized');
        console.log(`📍 Backend signer: ${signer.address}`);
        console.log(`📍 FishNFT: ${process.env.FISH_NFT_ADDRESS}`);
        console.log(`📍 FishingGame: ${process.env.FISHING_GAME_ADDRESS}`);

    } catch (error) {
        console.error('❌ Blockchain initialization failed:', error.message);
        throw error;
    }
}

/**
 * Start listening to FishCaught events using polling
 * @param {Function} onEvent - Callback when event is received
 */
export function listenToFishCaughtEvents(onEvent) {
    try {
        console.log('👂 Starting to poll for FishCaught events...');

        let lastCheckedBlock = 0;

        // Poll every 15 seconds
        const POLL_INTERVAL = 15000; // 15 seconds

        async function pollEvents() {
            try {
                const currentBlock = await provider.getBlockNumber();

                // First run - get last 1000 blocks
                if (lastCheckedBlock === 0) {
                    lastCheckedBlock = Math.max(0, currentBlock - 1000);
                }

                if (currentBlock > lastCheckedBlock) {
                    console.log(`🔍 Checking blocks ${lastCheckedBlock + 1} to ${currentBlock}...`);

                    const eventFilter = fishingGameContract.filters.FishCaught();
                    const events = await fishingGameContract.queryFilter(
                        eventFilter,
                        lastCheckedBlock + 1,
                        currentBlock
                    );

                    if (events.length > 0) {
                        console.log(`📦 Found ${events.length} new FishCaught events`);

                        for (const event of events) {
                            const [user, tokenId, tier, zone, bait, randomWord] = event.args;

                            const eventData = {
                                tokenId: tokenId.toString(),
                                userAddress: user.toLowerCase(),
                                tier: parseTier(tier),
                                zone: parseZone(zone),
                                baitType: parseBaitType(bait),
                                randomWord: randomWord.toString(),
                                mintTxHash: event.transactionHash,
                                blockNumber: event.blockNumber
                            };

                            console.log(`\n🎣 FishCaught event detected!`);
                            console.log(`   Token ID: ${tokenId.toString()}`);
                            console.log(`   User: ${user}`);
                            console.log(`   Tier: ${parseTier(tier)}`);
                            console.log(`   Zone: ${parseZone(zone)}`);

                            await onEvent(eventData);
                        }
                    }

                    lastCheckedBlock = currentBlock;
                }

            } catch (error) {
                console.error('❌ Error polling events:', error.message);
            }
        }

        // Start polling
        pollEvents(); // Run immediately
        setInterval(pollEvents, POLL_INTERVAL);

        console.log(`✅ Polling started (every ${POLL_INTERVAL / 1000}s)`);

    } catch (error) {
        console.error('❌ Failed to setup event polling:', error);
        throw error;
    }
}

/**
 * Catch up on past events (from last processed block)
 */
async function catchUpOnPastEvents(onEvent) {
    try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks

        console.log(`🔍 Checking for past events from block ${fromBlock} to ${currentBlock}...`);

        const eventFilter = fishingGameContract.filters.FishCaught();
        const events = await fishingGameContract.queryFilter(eventFilter, fromBlock, currentBlock);

        console.log(`📦 Found ${events.length} past FishCaught events`);

        for (const event of events) {
            const [user, tokenId, tier, zone, bait, randomWord] = event.args;

            const eventData = {
                tokenId: tokenId.toString(),
                userAddress: user.toLowerCase(),
                tier: parseTier(tier),
                zone: parseZone(zone),
                baitType: parseBaitType(bait),
                randomWord: randomWord.toString(),
                mintTxHash: event.transactionHash,
                blockNumber: event.blockNumber
            };

            await onEvent(eventData);
        }

    } catch (error) {
        console.error('❌ Error catching up on past events:', error);
    }
}

/**
 * Call setTokenURI on FishNFT contract
 * @param {string} tokenId - Token ID
 * @param {string} uri - IPFS URI (ipfs://...)
 * @returns {Promise<string>} Transaction hash
 */
export async function setTokenURI(tokenId, uri) {
    try {
        console.log(`📝 Setting tokenURI for token ${tokenId}...`);
        console.log(`   URI: ${uri}`);

        // Estimate gas
        const gasEstimate = await fishNFTContract.setTokenURI.estimateGas(tokenId, uri);
        const gasLimit = (gasEstimate * 120n) / 100n; // 20% buffer

        // Send transaction
        const tx = await fishNFTContract.setTokenURI(tokenId, uri, {
            gasLimit
        });

        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`   Waiting for confirmation...`);

        // Wait for confirmation
        const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS) || 2);

        if (receipt.status === 1) {
            console.log(`✅ tokenURI set successfully for token ${tokenId}`);
            return tx.hash;
        } else {
            throw new Error('Transaction failed');
        }

    } catch (error) {
        console.error(`❌ Failed to set tokenURI for token ${tokenId}:`, error.message);
        throw error;
    }
}

/**
 * Get backend signer address
 */
export function getSignerAddress() {
    return signer?.address;
}

/**
 * Check if backend signer is authorized
 */
export async function checkAuthorization() {
    try {
        // Try to check if backendSigner function exists (new contract)
        try {
            const backendSigner = await fishNFTContract.backendSigner();
            const signerAddress = signer.address;

            if (backendSigner.toLowerCase() !== signerAddress.toLowerCase()) {
                console.warn(`⚠️  Backend signer not authorized!`);
                console.warn(`   Expected: ${signerAddress}`);
                console.warn(`   Actual: ${backendSigner}`);
                console.warn(`   Run: FishNFT.setBackendSigner("${signerAddress}")`);
                return false;
            }

            console.log(`✅ Backend signer authorized: ${signerAddress}`);
            return true;

        } catch (error) {
            // If backendSigner() doesn't exist, check if signer is owner (old contract)
            const owner = await fishNFTContract.owner();
            const signerAddress = signer.address;

            if (owner.toLowerCase() === signerAddress.toLowerCase()) {
                console.log(`✅ Backend signer is contract owner (old contract - no backendSigner role)`);
                console.warn(`⚠️  WARNING: Using owner wallet as backend is less secure!`);
                return true;
            } else {
                console.warn(`⚠️  Backend signer not authorized and not owner!`);
                console.warn(`   Signer: ${signerAddress}`);
                console.warn(`   Owner: ${owner}`);
                return false;
            }
        }

    } catch (error) {
        console.error('❌ Failed to check authorization:', error.message);
        return false;
    }
}

// ============================================================================
// Helper functions to parse contract enums
// ============================================================================

function parseTier(tier) {
    const tiers = ['Junk', 'Common', 'Rare', 'Epic', 'Legendary'];
    return tiers[Number(tier)] || 'Common';
}

function parseZone(zone) {
    const zones = ['Shallow', 'Reef', 'DeepSea', 'Abyssal'];
    return zones[Number(zone)] || 'Shallow';
}

function parseBaitType(bait) {
    const baits = ['Common', 'Rare', 'Epic'];
    return baits[Number(bait)] || 'Common';
}

export default {
    initialize,
    listenToFishCaughtEvents,
    setTokenURI,
    getSignerAddress,
    checkAuthorization
};