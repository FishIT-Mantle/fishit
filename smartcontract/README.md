## FishIt Smart Contracts

Smart contracts untuk FishIt GameFi protocol di Mantle Network.

### Contracts

- **FishItStaking**: Core staking pool untuk native MNT
- **FishNFT**: ERC-721 NFT untuk ikan yang ditangkap
- **FishingGame**: Gameplay logic dengan Chainlink VRF
- **FishMarketplace**: Marketplace untuk trading NFT ikan

## Setup

### Install Dependencies

```bash
# Run setup script
./script/setup.sh

# Atau manual:
forge install OpenZeppelin/openzeppelin-contracts
```

### Environment Variables

Buat file `.env`:

```bash
PRIVATE_KEY=your_private_key
RPC_URL=https://rpc.testnet.mantle.xyz
```

## Usage

### Build

```bash
forge build
```

### Test

```bash
forge test
```

### Deploy

```bash
# Deploy semua kontrak
forge script script/DeployFishIt.s.sol:DeployFishIt \
  --rpc-url $RPC_URL \
  --broadcast \
  -vvvv
```

### Test Interactions

```bash
# Set deployed addresses
export STAKING_ADDRESS=0x...
export NFT_ADDRESS=0x...
export GAME_ADDRESS=0x...
export MARKETPLACE_ADDRESS=0x...

# Run test script
forge script script/TestInteractions.s.sol:TestInteractions \
  --rpc-url $RPC_URL \
  --broadcast \
  -vvvv
```

## Documentation

- **Deployment Scripts**: Lihat `script/README.md` untuk detail deployment dan testing
- **Foundry Docs**: https://book.getfoundry.sh/
- **PRD**: Lihat `../prd.md` untuk product requirements

## Scripts

- `script/DeployFishIt.s.sol` - Deploy semua kontrak dengan wiring otomatis
- `script/TestInteractions.s.sol` - Test interaksi dengan kontrak yang sudah di-deploy
- `script/MockVRFHelper.s.sol` - Helper untuk testing lokal dengan mock VRF
- `script/setup.sh` - Setup script untuk install dependencies
