# FishIt Deployment Scripts

Scripts untuk deploy dan test kontrak FishIt protocol.

## Setup

### 1. Install Dependencies

```bash
# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts

# Update remappings (if needed)
forge remappings > remappings.txt
```

### 2. Environment Variables

**Quick Setup (Recommended):**

```bash
# Interactive setup
./script/setup-env.sh
```

**Manual Setup:**

Copy `.env.example` ke `.env` dan isi values:

```bash
cp .env.example .env
# Edit .env file with your values
```

Required variables:
- `PRIVATE_KEY` - Deployer private key (without 0x prefix)
- `RPC_URL` - Network RPC URL (e.g., https://rpc.testnet.mantle.xyz)

Optional variables:
- `ADMIN_ADDRESS` - Admin address (defaults to deployer)
- `REVENUE_RECIPIENT_ADDRESS` - Treasury address (defaults to deployer)
- `SUPRA_ROUTER_ADDRESS` - Supra VRF Router address
- `ETHERSCAN_API_KEY` - For contract verification

## Deployment

### Quick Deploy (Recommended)

```bash
# Deploy all contracts
./script/deploy.sh
```

This script will:
- Validate environment variables
- Build contracts
- Deploy all contracts in correct order
- Wire contracts together
- Optionally verify contracts (if ETHERSCAN_API_KEY is set)

### Manual Deploy

```bash
forge script script/DeployFishIt.s.sol:DeployFishIt \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

### Deployment Order

Script ini akan deploy dalam urutan:
1. `FishItStaking`
2. `FishNFT`
3. `ZoneValidator`
4. `FishBait`
5. `FishingGame`
6. `FishUpgrade`
7. `FishMarketplace`

### Post-Deployment Setup

Automatically handled by deployment script:
- Wire `ZoneValidator.setFishingGame()`
- Wire `FishBait.setFishingGame()`
- Wire `FishNFT.setFishingGame()`
- Wire `FishNFT.setUpgradeContract()`
- Set Supra VRF config (if `SUPRA_ROUTER_ADDRESS` is configured)

### Update Supra VRF Config

Setelah deployment, update VRF config dengan Supra Router address yang benar:

```bash
source .env

# Update VRF config for FishingGame
cast send $GAME_ADDRESS \
  "setSupraVRFConfig(address,uint256)" \
  $SUPRA_ROUTER_ADDRESS \
  $SUPRA_NUM_CONFIRMATIONS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Update VRF config for FishUpgrade (if deployed)
cast send $FISH_UPGRADE_ADDRESS \
  "setSupraVRFConfig(address,uint256)" \
  $SUPRA_ROUTER_ADDRESS \
  $SUPRA_NUM_CONFIRMATIONS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

## Testing Interactions

### Quick Test (Recommended)

```bash
# Make sure contract addresses are set in .env file
./script/test-interactions.sh
```

### Manual Test

Update `.env` file with deployed contract addresses:

```bash
STAKING_ADDRESS=0x...
NFT_ADDRESS=0x...
GAME_ADDRESS=0x...
MARKETPLACE_ADDRESS=0x...
ZONE_VALIDATOR_ADDRESS=0x...  # Optional
FISH_BAIT_ADDRESS=0x...       # Optional
FISH_UPGRADE_ADDRESS=0x...    # Optional
```

Then run:

```bash
forge script script/TestInteractions.s.sol:TestInteractions \
  --rpc-url $RPC_URL \
  --broadcast \
  -vvvv
```

## Available Scripts

### deploy.sh
Deploy all contracts to the configured network.

**Usage:**
```bash
./script/deploy.sh
```

**Features:**
- Validates environment variables
- Builds contracts
- Deploys in correct order
- Wires contracts together
- Optional contract verification

### test-interactions.sh
Test interactions with deployed contracts.

**Usage:**
```bash
# Set contract addresses in .env first
./script/test-interactions.sh
```

**Requirements:**
- `STAKING_ADDRESS`
- `NFT_ADDRESS`
- `GAME_ADDRESS`
- `MARKETPLACE_ADDRESS`

### setup-env.sh
Interactive environment setup helper.

**Usage:**
```bash
./script/setup-env.sh
```

Guides you through setting up `.env` file with required values.

## Manual Testing dengan Cast

### Stake MNT

```bash
source .env
cast send $STAKING_ADDRESS \
  "stake()" \
  --value 1ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Purchase Bait

```bash
source .env
cast send $FISH_BAIT_ADDRESS \
  "purchaseBait(uint8,uint256)" \
  0 1 \
  --value 1ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
  --value 0.1ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Cast Line (Common Bait)

```bash
# Get bait price first
# Bait prices are in FishBait contract (hardcoded: 1, 2, 4 MNT)
BAIT_PRICE=$(cast call $FISH_BAIT_ADDRESS "getBaitPrice(uint8)" 0 --rpc-url $RPC_URL)  # Common = 0

cast send $GAME_ADDRESS \
  "castLine(uint8)" \
  0 \
  --value $BAIT_PRICE \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### List NFT di Marketplace

```bash
# Approve marketplace first
cast send $NFT_ADDRESS \
  "approve(address,uint256)" \
  $MARKETPLACE_ADDRESS \
  1 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# List NFT
cast send $MARKETPLACE_ADDRESS \
  "list(address,uint256,uint256)" \
  $NFT_ADDRESS \
  1 \
  1ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Buy NFT

```bash
cast send $MARKETPLACE_ADDRESS \
  "buy(address,uint256)" \
  $NFT_ADDRESS \
  1 \
  --value 1ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

## Contract Addresses (Save setelah deployment)

Setelah deployment, simpan addresses di file `deployments.json`:

```json
{
  "network": "mantle-testnet",
  "deploymentDate": "2025-01-XX",
  "contracts": {
    "FishItStaking": "0x...",
    "FishNFT": "0x...",
    "FishingGame": "0x...",
    "FishMarketplace": "0x..."
  }
}
```

## Troubleshooting

### VRF Not Configured

Jika `castLine` gagal karena VRF belum dikonfigurasi:
1. Setup Chainlink VRF subscription di Mantle testnet
2. Update VRF config menggunakan `setVRFConfig`
3. Atau gunakan mock VRF coordinator untuk testing lokal

### Insufficient Energy

Pastikan user sudah stake cukup MNT:
- 1 MNT = 1 energy/hari
- 4 MNT = 2 energy/hari
- 100 MNT = 10 energy/hari

### NFT URI Not Set

Backend harus listen ke event `FishCaught` dan call `setTokenURI` setelah AI generation selesai.