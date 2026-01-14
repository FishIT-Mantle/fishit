# FishIt Backend

AI-powered NFT metadata generator for the FishIt fishing game on Mantle Network.

## 🎯 What This Does

When a user catches a fish in the game:
1. **Listens** to `FishCaught` events from smart contract
2. **Generates** unique fish image using Google Gemini AI
3. **Uploads** image + metadata to IPFS (Pinata)
4. **Finalizes** NFT by calling `setTokenURI()` on-chain

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 14+ (Railway provides this)
- Google Gemini API key
- Pinata account (IPFS)
- Mantle RPC access

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your values:

```env
# Blockchain
RPC_URL=https://rpc.mantle.xyz
FISH_NFT_ADDRESS=0x...
FISHING_GAME_ADDRESS=0x...
BACKEND_SIGNER_PRIVATE_KEY=0x...

# AI
GEMINI_API_KEY=your_gemini_key

# IPFS
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret

# Database
DATABASE_URL=postgresql://user:pass@host:5432/fishit
```

### 3. Setup Database

Create the database schema:

```bash
npm run db:setup
```

This creates the `fish_mints` table and indexes.

### 4. Deploy Smart Contract Changes

**IMPORTANT:** Update `FishNFT.sol` with the modified version (adds `backendSigner` role).

After deployment, set the backend signer:

```javascript
// Using ethers.js or Foundry
await fishNFT.setBackendSigner("0xYourBackendWalletAddress");
```

### 5. Start Backend

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## 📁 Project Structure

```
fishit-backend/
├── src/
│   ├── config/
│   │   └── database.js          # PostgreSQL connection
│   ├── repositories/
│   │   └── fishMintRepository.js # Database queries
│   ├── services/
│   │   ├── blockchainService.js  # Web3 event listener
│   │   ├── imageGenerator.js     # Gemini AI image gen
│   │   ├── ipfsUploader.js       # Pinata IPFS upload
│   │   └── mintProcessor.js      # Main orchestrator
│   ├── workers/
│   │   └── retryWorker.js        # Failed mint retry system
│   └── index.js                  # Main entry point
├── scripts/
│   └── setup-db.js               # Database setup
├── abi/                          # Smart contract ABIs
│   ├── FishNFT.json
│   └── FishingGame.json
├── schema.sql                    # Database schema
├── package.json
├── .env.example
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RPC_URL` | Mantle RPC endpoint | ✅ |
| `FISH_NFT_ADDRESS` | FishNFT contract address | ✅ |
| `FISHING_GAME_ADDRESS` | FishingGame contract address | ✅ |
| `BACKEND_SIGNER_PRIVATE_KEY` | Backend wallet private key | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `PINATA_API_KEY` | Pinata API key | ✅ |
| `PINATA_SECRET_KEY` | Pinata secret API key | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `MAX_RETRY_ATTEMPTS` | Max retries for failed mints | ❌ (default: 5) |
| `RETRY_INTERVAL_MINUTES` | Retry check interval | ❌ (default: 5) |
| `MAX_CONCURRENT_GENERATIONS` | Parallel AI generations | ❌ (default: 3) |

## 🎨 How It Works

### Event Processing Flow

```
User casts line
    ↓
FishCaught event emitted
    ↓
Backend catches event
    ↓
Save to DB (status: pending)
    ↓
Generate AI image (status: generating)
    ↓
Upload to IPFS (status: uploading)
    ↓
Call setTokenURI() (status: finalizing)
    ↓
Complete (status: completed)
```

### Retry Logic

If any step fails:
- Status is marked as `failed`
- Retry count is incremented
- Retry worker picks it up every 5 minutes
- Max 5 retries before giving up

### Database Status Values

| Status | Description |
|--------|-------------|
| `pending` | Event received, not processed yet |
| `generating` | AI image generation in progress |
| `generated` | Image ready, not uploaded |
| `uploading` | IPFS upload in progress |
| `uploaded` | IPFS complete, not finalized |
| `finalizing` | setTokenURI transaction sent |
| `completed` | Fully processed ✅ |
| `failed` | Processing failed ❌ |

## 🚂 Deployment (Railway)

### One-Click Deploy

1. Push code to GitHub
2. Connect Railway to your repo
3. Add PostgreSQL plugin
4. Set environment variables
5. Deploy!

### Railway Configuration

**Services:**
- **App**: Node.js (auto-detected from `package.json`)
- **Database**: PostgreSQL 14

**Environment Variables:**
Set all variables from `.env.example` in Railway dashboard.

**Start Command:**
```bash
npm run db:setup && npm start
```

## 🧪 Testing

### Manual Test

```bash
# Test event listener
node src/index.js

# Trigger retry worker manually
node -e "import('./src/workers/retryWorker.js').then(w => w.trigger())"
```

### Check Database

```bash
psql $DATABASE_URL

# View recent mints
SELECT token_id, tier, status, created_at FROM fish_mints ORDER BY created_at DESC LIMIT 10;

# View failed mints
SELECT * FROM fish_mints WHERE status = 'failed';

# View statistics
SELECT * FROM fish_stats;
```

## 🔒 Security

### Private Key Safety

**NEVER:**
- ❌ Commit `.env` to Git
- ❌ Share backend signer private key
- ❌ Use owner key as backend signer

**ALWAYS:**
- ✅ Use separate backend signer role
- ✅ Store keys in Railway secrets
- ✅ Use `.env.example` for reference only

### Backend Signer vs Owner

- **Owner**: Full control of FishNFT contract
- **Backend Signer**: Can only call `setTokenURI()` 

If backend is compromised:
- ❌ Cannot steal NFTs
- ❌ Cannot change contract logic
- ✅ Can only set metadata (recoverable)

## 📊 Monitoring

### Logs

```bash
# View real-time logs
npm start

# Check status
SELECT status, COUNT(*) FROM fish_mints GROUP BY status;
```

### Health Checks

Backend logs show:
- ✅ Event received
- 🎨 Image generated
- 📤 IPFS uploaded
- ⛓️ On-chain finalized

## 🐛 Troubleshooting

### "Backend signer not authorized"

Run on smart contract:
```solidity
FishNFT.setBackendSigner(backendWalletAddress);
```

### "Gemini API rate limit"

Free tier: 500 requests/day. Upgrade or wait.

### "IPFS upload timeout"

Pinata might be slow. Retry worker will handle it.

### "Transaction failed"

Check:
- RPC endpoint is working
- Backend wallet has gas (MNT)
- Gas price settings

## 📝 License

MIT

## 🙋 Support

For issues, check:
1. Railway logs
2. Database `fish_mints` table
3. Smart contract events on explorer