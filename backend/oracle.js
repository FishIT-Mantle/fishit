import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://rpc.sepolia.mantle.xyz";
const ORACLE_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; 
const GAME_CONTRACT_ADDRESS = process.env.FISHING_GAME_ADDRESS || "0xe72c38663d6d55571b612e2b13bb487bc080dac4";
const MOCK_ROUTER_ADDRESS = "0x88377eA4eb0841E8DA11852E67732a08D559d852";
const CHECKPOINT_FILE = path.join(process.cwd(), ".oracle-checkpoint.json");

// ✅ Correct ABIs
const GAME_ABI = [
  "event CastLineRequested(address indexed user, uint8 zone, uint8 bait, uint256 indexed requestId)"
];

const MOCK_ROUTER_ABI = [
  "function fulfillRequest(uint256 requestId, uint256[] memory rngList, uint256 clientSeed) external"
];

// Load/save checkpoint
function loadCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
      console.log(`📂 Loaded checkpoint: Block ${data.lastBlock}`);
      return data.lastBlock;
    }
  } catch (err) {
    console.log("⚠️  Failed to load checkpoint:", err.message);
  }
  return null;
}

function saveCheckpoint(blockNumber) {
  try {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ lastBlock: blockNumber }, null, 2));
  } catch (err) {
    console.log("⚠️  Failed to save checkpoint:", err.message);
  }
}

async function main() {
  console.log("🔮 Starting Mock Supra VRF Oracle...");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_ABI, wallet);
  const mockRouter = new ethers.Contract(MOCK_ROUTER_ADDRESS, MOCK_ROUTER_ABI, wallet);

  console.log(`📍 Oracle Wallet: ${wallet.address}`);
  console.log(`🎮 Watching Game: ${GAME_CONTRACT_ADDRESS}`);
  console.log(`🔧 Mock Router: ${MOCK_ROUTER_ADDRESS}`);

  // Determine starting block
  let lastCheckedBlock = loadCheckpoint();
  
  if (!lastCheckedBlock) {
    const currentBlock = await provider.getBlockNumber();
    lastCheckedBlock = currentBlock - 1000;
    console.log(`🔍 No checkpoint found. Starting catch-up from ${lastCheckedBlock} (1000 blocks ago)`);
  }

  // Keep track of fulfilled requests
  const fulfilledRequests = new Set();

  async function checkAndFulfill() {
    try {
      const currentBlock = await provider.getBlockNumber();
      const safeToBlock = currentBlock - 5;

      if (safeToBlock <= lastCheckedBlock) {
        return;
      }

      console.log(`Checking blocks ${lastCheckedBlock + 1} to ${safeToBlock}...`);

      // Query for CastLineRequested events
      const events = await gameContract.queryFilter(
        "CastLineRequested", 
        lastCheckedBlock + 1, 
        safeToBlock
      );

      if (events.length > 0) {
        console.log(`\n🎣 Found ${events.length} CastLineRequested event(s)!`);
      }

      for (const event of events) {
        const requestId = event.args.requestId;
        const user = event.args.user;
        const zone = event.args.zone;
        const bait = event.args.bait;
        
        if (fulfilledRequests.has(requestId.toString())) {
          console.log(`   ⏭️  Request #${requestId} already fulfilled, skipping...`);
          continue;
        }

        console.log(`\n🎯 New Cast Detected!`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Request ID: ${requestId}`);
        console.log(`   User: ${user}`);
        console.log(`   Zone: ${zone}, Bait: ${bait}`);

        try {
          // Generate random seed (0-999999)
          const randomSeed = Math.floor(Math.random() * 1000000);
          console.log(`   🎲 Generated Random Seed: ${randomSeed}`);
          
          // ✅ Call MockRouter.fulfillRequest (which will callback to the game)
          const tx = await mockRouter.fulfillRequest(
            requestId,
            [randomSeed],
            0 // clientSeed (can be 0 for mock)
          );
          
          console.log(`   📤 Transaction sent: ${tx.hash}`);
          console.log(`   ⏳ Waiting for confirmation...`);
          
          const receipt = await tx.wait();
          
          console.log(`   ✅ Request #${requestId} fulfilled!`);
          console.log(`   🧾 Gas used: ${receipt.gasUsed.toString()}`);
          
          fulfilledRequests.add(requestId.toString());
          
        } catch (err) {
          if (err.message.includes("Invalid request")) {
            console.log(`   ⚠️  Request #${requestId} already fulfilled or invalid`);
            fulfilledRequests.add(requestId.toString());
          } else if (err.message.includes("nonce")) {
            console.log(`   ⚠️  Nonce error, will retry next cycle`);
          } else {
            console.error(`   ❌ Error fulfilling request #${requestId}:`);
            console.error(`      ${err.message}`);
          }
        }
      }

      lastCheckedBlock = safeToBlock;
      saveCheckpoint(lastCheckedBlock);

    } catch (error) {
      console.log(`⚠️ Polling error (ignoring): ${error.code || error.message}`);
    }
  }

  console.log("🚀 Running initial catch-up scan...");
  await checkAndFulfill();
  
  setInterval(checkAndFulfill, 10000);
  
  console.log("\n✅ Oracle is now running!");
  console.log("👀 Polling every 10 seconds for new cast events...");
  console.log(`💾 Checkpoint saved to: ${CHECKPOINT_FILE}\n`);
}

main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});