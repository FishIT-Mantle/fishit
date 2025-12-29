# Supra VRF Migration Guide

## Overview

FishIt smart contracts telah dimigrasikan dari Chainlink VRF ke **Supra VRF** untuk kompatibilitas dengan Mantle Network.

## Perubahan Utama

### 1. Interface Baru
- **File**: `src/interfaces/ISupraRouter.sol`
- Interface untuk berinteraksi dengan Supra VRF Router

### 2. FishingGame Contract
- **VRF Provider**: Chainlink → Supra VRF
- **Function**: `setVRFConfig()` → `setSupraVRFConfig()`
- **Callback**: `fulfillRandomWords()` → `supraVRFCallback()`

### 3. Konfigurasi VRF

**Sebelum (Chainlink):**
```solidity
address vrfCoordinator;
bytes32 vrfKeyHash;
uint64 vrfSubscriptionId;
uint16 vrfMinConfirmations;
uint32 vrfCallbackGasLimit;
```

**Sesudah (Supra):**
```solidity
ISupraRouter supraRouter;
uint256 supraNumConfirmations;
string constant SUPRA_CALLBACK_SIG = "supraVRFCallback(uint256,uint256[],uint256)";
```

## Setup Supra VRF untuk Mantle

### 1. Dapatkan Supra Router Address
- Cek dokumentasi Supra untuk Mantle Network
- Router address berbeda untuk testnet dan mainnet

### 2. Update Deployment Script
Edit `script/DeployFishIt.s.sol`:
```solidity
address public constant SUPRA_ROUTER = 0x...; // Supra Router address untuk Mantle
uint256 public constant SUPRA_NUM_CONFIRMATIONS = 3;
```

### 3. Deploy Contracts
```bash
forge script script/DeployFishIt.s.sol:DeployFishIt \
  --rpc-url $RPC_URL \
  --broadcast \
  -vvvv
```

### 4. Konfigurasi VRF (jika belum di-deploy script)
```solidity
fishingGame.setSupraVRFConfig(supraRouterAddress, numConfirmations);
```

## Testing

### Mock Supra Router
File `test/mocks/MockSupraRouter.sol` menyediakan mock router untuk testing lokal.

**Usage dalam test:**
```solidity
MockSupraRouter mockRouter = new MockSupraRouter();
fishingGame.setSupraVRFConfig(address(mockRouter), 3);

// Cast line
uint256 requestId = fishingGame.castLine{value: baitPrice}(BaitType.Common);

// Fulfill request
uint256[] memory rngList = new uint256[](1);
rngList[0] = 5000; // Random number
mockRouter.fulfillRequest(requestId, rngList, 0);
```

### Run Tests
```bash
forge test
forge test --match-contract FishingGameTest
```

## Callback Function Signature

Supra VRF memanggil callback dengan signature:
```solidity
function supraVRFCallback(
    uint256 _requestId,
    uint256[] memory _rngList,
    uint256 _clientSeed
) external onlySupraRouter
```

**Parameter:**
- `_requestId`: Request ID dari Supra Router
- `_rngList`: Array of random numbers (kita gunakan yang pertama)
- `_clientSeed`: Client seed yang dikirim saat request

## Request Flow

1. **User calls `castLine()`**
   - Generate client seed
   - Call `supraRouter.generateRequest()`
   - Store request info

2. **Supra Router processes**
   - Generate random numbers off-chain
   - Wait for block confirmations
   - Call `supraVRFCallback()`

3. **Callback executes**
   - Verify caller is Supra Router
   - Extract random number from `_rngList[0]`
   - Calculate rarity
   - Mint NFT
   - Emit `FishCaught` event

## Perbedaan dengan Chainlink VRF

| Feature | Chainlink VRF | Supra VRF |
|---------|--------------|-----------|
| Random Format | Single uint256 | Array uint256[] |
| Callback Signature | `fulfillRandomWords(uint256,uint256)` | `supraVRFCallback(uint256,uint256[],uint256)` |
| Request Method | `requestRandomWords()` | `generateRequest()` |
| Client Seed | Tidak ada | Ada (optional) |
| Subscription | Perlu subscription ID | Tidak perlu |

## Production Checklist

- [ ] Dapatkan Supra Router address untuk Mantle mainnet
- [ ] Update `SUPRA_ROUTER` di deployment script
- [ ] Test di Mantle testnet terlebih dahulu
- [ ] Verifikasi callback function signature sesuai
- [ ] Monitor gas usage untuk callback
- [ ] Setup monitoring untuk VRF requests
- [ ] Dokumentasikan Supra Router address untuk team

## Resources

- Supra Documentation: https://supra.com/docs
- Mantle Network: https://www.mantle.xyz
- Supra VRF Integration Guide: Check Supra docs for Mantle-specific details

## Troubleshooting

### Error: "VRF not configured"
- Pastikan `setSupraVRFConfig()` sudah dipanggil
- Pastikan router address bukan zero address

### Error: "Not Supra Router"
- Pastikan callback dipanggil dari Supra Router address
- Jangan panggil callback secara manual di production

### Callback tidak dipanggil
- Cek apakah request berhasil dibuat
- Pastikan Supra Router sudah terkonfigurasi dengan benar
- Cek block confirmations sudah tercapai

