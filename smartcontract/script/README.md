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

Buat file `.env` di root project:

```bash
PRIVATE_KEY=your_private_key_here
RPC_URL=https://rpc.testnet.mantle.xyz  # Mantle testnet
# atau
RPC_URL=http://localhost:8545  # Local node
```

## Deployment

### Deploy Semua Kontrak

```bash
forge script script/DeployFishIt.s.sol:DeployFishIt \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

Script ini akan:
1. Deploy `FishItStaking`
2. Deploy `FishNFT`
3. Deploy `FishingGame`
4. Deploy `FishMarketplace`
5. Wire semua kontrak bersama
6. Set bait prices
7. Set VRF config (placeholder)

### Update VRF Config

Setelah deployment, update VRF config dengan nilai Chainlink yang benar:

```bash
# Set environment variables untuk deployed addresses
export GAME_ADDRESS=0x...

# Update VRF config
cast send $GAME_ADDRESS \
  "setVRFConfig(address,bytes32,uint64,uint16,uint32)" \
  <VRF_COORDINATOR> \
  <KEY_HASH> \
  <SUBSCRIPTION_ID> \
  <MIN_CONFIRMATIONS> \
  <CALLBACK_GAS_LIMIT> \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

## Testing Interactions

### Setup Environment Variables

```bash
export STAKING_ADDRESS=0x...
export NFT_ADDRESS=0x...
export GAME_ADDRESS=0x...
export MARKETPLACE_ADDRESS=0x...
export PRIVATE_KEY=your_private_key
```

### Run Test Script

```bash
forge script script/TestInteractions.s.sol:TestInteractions \
  --rpc-url $RPC_URL \
  --broadcast \
  -vvvv
```

## Manual Testing dengan Cast

### Stake MNT

```bash
cast send $STAKING_ADDRESS \
  "stake()" \
  --value 1ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Fund Reward Pool

```bash
cast send $STAKING_ADDRESS \
  "fundRewardPool()" \
  --value 0.1ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Cast Line (Common Bait)

```bash
# Get bait price first
BAIT_PRICE=$(cast call $GAME_ADDRESS "commonBaitPrice()" --rpc-url $RPC_URL)

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

