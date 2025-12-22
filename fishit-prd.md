# FISHIT – PRODUCT REQUIREMENT DOCUMENT (FINAL)

**Web3 Fishing Game with Controlled Economy**

- **Version:** MVP-1.0
- **Author:** FishIt Team
- **Status:** Final – Ready for Development

---

## 1. TUJUAN PRODUK

FishIt adalah game memancing berbasis Web3 di mana:

- Pemain **membayar attempt (bait)**.
- Hasil didapat lewat **RNG**.
- Tidak ada janji profit.
- Ekonomi dijaga lewat **sink, cost, dan pacing**.

Game ini **bukan Play-to-Earn**, melainkan:

- **Play-for-fun** dengan ekonomi tertutup dan terkontrol.

---

## 2. PRINSIP DESAIN (INVARIANT – TIDAK BOLEH DILANGGAR)

- Semua fishing attempt **selalu membutuhkan bait**.
- Tidak ada reward pasif / yield.
- Semua zona memiliki **negative EV**.
- Zona lebih tinggi = **biaya & risiko lebih tinggi**.
- Staking **tidak meningkatkan drop rate**.
- Legendary **tidak di-upgrade & tidak di-burn** (MVP).

---

## 3. RESOURCE UTAMA

### 3.1 Token

**MNT (Mantle)**
Digunakan untuk:

- Membeli bait.
- Zone entry fee.
- Staking (license).
- _Note: Tidak ada mint reward token._

### 3.2 Fish Tier (FINAL)

| Tier          | Fungsi                         |
| :------------ | :----------------------------- |
| **Common**    | Fuel / burn                    |
| **Rare**      | Progress / akses               |
| **Epic**      | Endgame / high risk            |
| **Legendary** | Prestige / flex (MVP: no sink) |

### 3.3 Bait (FINAL – 3 JENIS)

| Bait            | Harga | Fungsi                            |
| :-------------- | :---- | :-------------------------------- |
| **Common Bait** | 1 MNT | Baseline, junk tinggi             |
| **Rare Bait**   | 2 MNT | Lebih efisien (junk lebih rendah) |
| **Epic Bait**   | 4 MNT | High volatility, thrill           |

**Catatan penting:**
Perbedaan bait **bukan sekadar tier naik**, tapi:

- **Common:** Murah & grind.
- **Rare:** Kurangi rasa capek.
- **Epic:** Risiko & excitement.

---

## 4. STAKING (LICENSE SYSTEM)

Staking bersifat **threshold-based**, bukan linear.

| Stake MNT | License     | Akses  |
| :-------- | :---------- | :----- |
| < 100     | None        | Zona 1 |
| ≥ 100     | License I   | Zona 2 |
| ≥ 250     | License II  | Zona 3 |
| ≥ 500     | License III | Zona 4 |

**Aturan tambahan:**

- Unstake cooldown: **3 hari**.
- Tidak memengaruhi drop rate.
- Tidak memberi reward.

---

## 5. ZONA (FINAL – 4 ZONA)

### ZONA 1 – SHALLOW WATERS (ONBOARDING)

- **Tujuan:** Entry point, Source Common, Bot sink awal.
- **Syarat:**
  - 1 bait (apa pun).
  - Tidak perlu stake.

**Drop Table:**

- **Common Bait:** Junk: 40% | Common: 45% | Rare: 14% | Epic: 1% | Legendary: 0%
- **Rare Bait:** Junk: 30% | Common: 45% | Rare: 22% | Epic: 3% | Legendary: 0%
- **Epic Bait:** Junk: 20% | Common: 40% | Rare: 30% | Epic: 9% | Legendary: 1%

### ZONA 2 – REEF ZONE (MID GAME)

- **Tujuan:** Burn Common, Progress terasa.
- **Syarat:**
  - 1 bait.
  - Burn **3 Common**.
  - Stake ≥100 MNT.

**Drop Table:**

- **Common Bait:** Junk: 30% | Common: 30% | Rare: 28% | Epic: 10% | Legendary: 2%
- **Rare Bait:** Junk: 20% | Common: 30% | Rare: 35% | Epic: 12% | Legendary: 3%
- **Epic Bait:** Junk: 15% | Common: 25% | Rare: 35% | Epic: 20% | Legendary: 5%

### ZONA 3 – DEEP SEA (HIGH RISK)

- **Tujuan:** Sink Rare, Whale pressure.
- **Syarat:**
  - 1 bait.
  - Burn **2 Rare**.
  - Stake ≥250 MNT.
  - Entry fee: **1 MNT**.

**Drop Table (SEMUA BAIT):**

- Junk: 20%
- Common: 15%
- Rare: 30%
- Epic: 25%
- Legendary: 10%

### ZONA 4 – ABYSSAL TRENCH (PRESTIGE)

- **Tujuan:** Legendary source, Endgame prestige.
- **Syarat:**
  - 1 bait (**Epic Bait ONLY**).
  - Burn **1 Epic**.
  - Stake ≥500 MNT.
  - Entry fee: **3 MNT**.
  - Cooldown: **1x / 24 jam**.

**Drop Table:**

- Junk: 15%
- Rare: 20%
- Epic: 40%
- Legendary: 25%
- _(Legendary hanya drop di zona ini)_

---

## 6. UPGRADE SYSTEM

**Common → Rare**

- Burn 5 Common.
- 100% success.

**Rare → Epic**

- Burn 3 Rare.
- 40% success.
- 60% destroy.

❌ **Epic → Legendary DITIADAKAN (MVP)**

---

## 7. PEMISAHAN TUGAS TEKNIS (WAJIB JELAS)

### 7.1 SMART CONTRACT (ON-CHAIN)

SC Bertanggung Jawab atas:

- **Staking Contract:** Stake / unstake, cooldown, license tier.
- **Bait Contract:** Purchase bait, consume bait.
- **Fish NFT (ERC-721):** Mint, burn, transfer.
- **Zone Validator:** Cek stake tier, cek burn requirement, enforce fee & cooldown.
- **RNG:** Chainlink VRF, hasil final on-chain.

**SC TIDAK:**

- Generate image.
- Store metadata.
- Balance ekonomi.

### 7.2 BACKEND (OFF-CHAIN)

Backend WAJIB handle:

- **Game Configuration:** Drop table, bait modifier, zone rule.
- **AI Image Generation:** Generate fish image berdasarkan tier, prompt berbeda per tier, style konsisten.
- **IPFS Integration:** Upload image, pin image, upload metadata JSON.
- **Metadata Builder:** Name, tier, zone, seed, image CID.
- **Event Listener:** Listen `FishMintRequested`, finalize mint setelah metadata siap.
- **Analytics:** Mint vs burn, distribution tier, whale behavior.

### 7.3 FRONTEND (FE)

FE Bertanggung Jawab atas:

- Wallet connect (Mantle).
- **Inventory:** Bait, fish per tier.
- **Fishing UI:** Animation, suspense delay.
- **UI Components:** Zone selection UI, Upgrade UI, Risk & odds display.
- Transaction state handling.

---

## 8. AI & IPFS FLOW (DETAIL)

1.  User fishing → SC mint request.
2.  SC emit event.
3.  BE: Generate image via AI.
4.  BE: Upload image → IPFS.
5.  BE: Generate metadata → IPFS.
6.  BE call SC → `finalizeMint(tokenId, uri)`.

---

## 9. EKONOMI CHECK (SANITY)

- Semua zona EV negatif.
- Legendary supply dikontrol lewat: Zona terbatas, cooldown, biaya tinggi.
- Whale tidak punya loop aman.

---

## 10. YANG DITUNDA (SENGAJA)

- Legendary sink.
- Seasonal system.
- Cosmetic layer.
- Advanced marketplace.

---

## 11. PENUTUP

PRD ini:

- Tidak mengurangi spek game.
- Tidak menambah konsep baru.
- Ekonomi serius.
- Teknis jelas.
- **Siap langsung dikerjakan tim.**
