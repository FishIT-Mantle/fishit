# PRODUCT REQUIREMENT DOCUMENT  
## FishIt  
### GameFi Layer untuk Ekosistem Mantle Yield  

**Versi:** 2.0  
**Tanggal:** 20 November 2025  
**Owner:** Tim Produk (Wildan)  
**Status:** Brainstorming & Draft  

---

## DAFTAR ISI
1. Ringkasan Eksekutif  
2. Masalah yang Mau Diselesaikan  
3. Konsep & Cara Kerja  
4. Siapa yang Mau Kita Target  
5. Fitur-Fitur Detail  
6. Teknologi & Arsitektur  
7. Model Bisnis  
8. Roadmap Pengembangan  
9. Risiko & Mitigasi  
10. Next Steps  

---

## 1. RINGKASAN EKSEKUTIF

### 1.1 Apa itu FishIt?
FishIt adalah platform yang mengubah aktivitas staking MNT di Mantle Network menjadi pengalaman bermain game memancing yang seru. Daripada hanya deposit token dan menunggu yield, user bisa aktif bermain, menangkap ikan NFT yang unik, dan ikan tersebut dapat meningkatkan pendapatan staking.

Alur inti:  
**Stake MNT → Dapat Energy → Mancing → Tangkap Ikan NFT (AI-generated) → Boost Yield → Dapat Reward**

Yield berasal dari protokol Mantle (real yield), bukan token inflasi.

### 1.2 Kenapa FishIt Menarik?

**Buat Stakers DeFi**
- Staking tidak membosankan
- Tetap dapat real yield Mantle + bonus NFT
- Tidak ada lock period

**Buat Gamers**
- Gameplay simpel
- NFT ikan unik (AI-generated)
- Earn crypto nyata

**Buat Kolektor NFT**
- NFT punya utilitas (boost yield)
- Setiap NFT unik
- Bisa dijual di marketplace

### 1.3 Alur Game Utama
**STAKE MNT → DAPAT ENERGY → MANCING → TANGKAP IKAN NFT → BOOST YIELD → CLAIM REWARD**

---

## 2. MASALAH YANG MAU DISELESAIKAN

### 2.1 Problem di DeFi Sekarang

**Staking itu Boring**  
Hanya deposit dan menunggu, tanpa engagement.

**GameFi Tidak Sustainable**  
Bergantung pada token inflasi, berujung pada penurunan nilai.

**NFT Tanpa Utility**  
Mayoritas hanya gambar tanpa fungsi nyata.

**User Baru Bingung**  
DeFi kompleks dan barrier to entry tinggi.

### 2.2 Kenapa Sekarang Waktu yang Tepat?
- Mantle punya real yield yang solid
- AI generation makin murah dan cepat
- Market lelah dengan Ponzi GameFi
- Gas fee Mantle rendah
- Ekosistem Mantle sedang berkembang

---

## 3. KONSEP & CARA KERJA

### 3.1 Konsep Dasar
FishIt adalah layer gamifikasi di atas staking Mantle. User tetap stake MNT dan mendapat yield dasar, dengan bonus dari gameplay memancing.

### 3.2 Komponen Utama

#### Staking Pool
- Deposit MNT ke smart contract
- Dana masuk vault yield Mantle
- Tidak ada lock period

#### Fishing Energy System
Energy = √(jumlah MNT distake)

Contoh:
- 1 MNT → 1 energy/hari  
- 4 MNT → 2 energy/hari  
- 100 MNT → 10 energy/hari  
- 10,000 MNT → 100 energy/hari  

Energy regenerate setiap 24 jam.

#### Fishing Gameplay
1. Pilih Umpan (Common / Rare / Epic)
2. Lempar Pancing (Cast Line + mini-game)
3. Tangkap Ikan (Chainlink VRF)

#### AI-Generated NFT Fish
NFT di-generate berdasarkan:
- Rarity
- Random seed
- Traits (species, warna, pattern, accessories)

Metadata on-chain (ERC-721), gambar di IPFS.

#### Yield Boost System

| Rarity      | Boost Yield |
|------------|-------------|
| Common     | +0%         |
| Rare       | +1%         |
| Epic       | +3%         |
| Legendary  | +5%         |

Effective APY = Base APY × (1 + boost)

Sumber bonus yield:
- Fee umpan
- Fee marketplace
- Revenue fitur premium

---

## 4. SIAPA YANG MAU KITA TARGET

### 4.1 DeFi Users yang Bosen
- Cari engagement
- Cari protokol sustainable
- Tetap fleksibel

### 4.2 Casual Gamers
- Gameplay simpel
- Bisa earning
- Entry cost rendah (mulai 1 MNT)

### 4.3 NFT Collectors & Traders
- NFT unik
- Ada utility
- Marketplace aktif

---

## 5. FITUR-FITUR DETAIL

### 5.1 Staking
- Minimum: 1 MNT
- Maximum: Tidak ada
- Lock period: 0
- Fee: Tidak ada

### 5.2 Sistem Umpan (Bait)

| Tipe | Biaya | Common | Rare | Epic | Legendary |
|-----|-------|--------|------|------|-----------|
| Common | 0.05 MNT | 70% | 25% | 4.5% | 0.5% |
| Rare | 0.15 MNT | 50% | 35% | 13% | 2% |
| Epic | 0.50 MNT | 30% | 40% | 25% | 5% |

### 5.3 Proses Mancing

**Step 1: User Action**
- Pilih bait
- Klik Cast Line
- Energy berkurang 1

**Step 2: On-Chain**
- Request Chainlink VRF
- Mint NFT placeholder
- Emit event FishCaught

**Step 3: Backend**
- Generate AI image
- Upload ke IPFS
- Set tokenURI

**Step 4: User**
- NFT masuk wallet
- Bisa activate boost atau jual

### 5.4 NFT Gallery & Management
- View collection
- Detail NFT
- Activate/deactivate boost
- List for sale (fee 2.5%)

### 5.5 Marketplace
- Browse & filter
- Instant buy
- Cancel listing
- Fee 2.5% (50% reward pool, 50% revenue)

### 5.6 Claim Yield & Unstake
- Claim yield tanpa unstake
- Unstake = principal + yield
- Energy reset saat unstake

---

## 6. TEKNOLOGI & ARSITEKTUR

### 6.1 Tech Stack

| Komponen | Teknologi |
|--------|-----------|
| Blockchain | Mantle Network |
| Smart Contract | Solidity, OpenZeppelin, UUPS |
| Randomness | Chainlink VRF |
| Backend | Node.js, Express, PostgreSQL, Redis |
| AI | Gemini 1.5 Flash |
| Storage | IPFS (Pinata) |
| Frontend | Next.js 14, viem, RainbowKit, Tailwind |

### 6.2 Smart Contract Design
- FishItStaking
- FishNFT (ERC-721)
- FishingGame
- Marketplace

Security:
- Reentrancy guard
- Access control
- UUPS proxy
- Emergency pause
- Audit wajib

### 6.3 Backend Services
- Event listener
- AI generator
- IPFS manager
- Operator wallet
- API & WebSocket

### 6.4 Frontend
- Wallet connection
- Real-time dashboard
- NFT gallery
- Marketplace
- Mobile responsive (desktop-first)

---

## 7. MODEL BISNIS

### 7.1 Revenue Streams
1. Bait fees (80% reward pool, 20% revenue)
2. Marketplace fees (2.5%)
3. Future premium features

### 7.2 Sustainability Reward Pool
Sumber:
- 80% bait fees
- 50% marketplace fees
- 100% premium features

Target buffer: ≥30 hari payout

### 7.3 Margin & Profitability
Estimasi cost: $1,200–2,600 / bulan  
Break-even dengan ±3,000 active users

---

## 8. ROADMAP PENGEMBANGAN

### Phase 0 (2 minggu)
- Finalisasi PRD
- UI/UX design
- Setup repo

### Phase 1 (8 minggu)
- Core infrastructure
- Fishing & NFT
- Internal alpha

### Phase 2 (6 minggu)
- Yield system
- Marketplace
- Closed beta

### Phase 3 (4 minggu)
- Audit
- Mainnet deploy
- Marketing prep

### Phase 4 (3 bulan)
- Iteration
- Mobile optimization
- Community

### Phase 5 (6+ bulan)
- Breeding
- Seasonal events
- Tournament
- Governance token
- Cross-chain

---

## 9. RISIKO & MITIGASI

### 9.1 Teknis
- Smart contract bug → Audit & bug bounty
- RNG abuse → Chainlink VRF
- AI/IPFS downtime → Fallback & retry

### 9.2 Ekonomi
- Reward pool habis → Buffer & dynamic adjust
- Whale dominance → Energy sqrt formula

### 9.3 Pasar
- Low adoption → Marketing & partnership
- Competitor → First mover & UX

---

## 10. NEXT STEPS

**Immediate (1–2 minggu)**
- Review PRD
- UI/UX design sprint
- Kick-off Phase 1

**Short-term (1–3 bulan)**
- MVP development
- Internal testing
- Mantle partnership

**Mid-term (4–6 bulan)**
- Audit
- Closed beta
- Mainnet launch

---

**Penutup**  
PRD ini adalah living document dan dapat diperbarui seiring progress development.
