// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {FishItStaking} from "../src/FishItStaking.sol";
import {FishNFT} from "../src/FishNFT.sol";
import {FishingGame} from "../src/FishingGame.sol";
import {FishMarketplace} from "../src/FishMarketplace.sol";
import {ZoneValidator} from "../src/ZoneValidator.sol";
import {FishBait} from "../src/FishBait.sol";
import {FishUpgrade} from "../src/FishUpgrade.sol";

/**
 * @title TestInteractions
 * @notice Script untuk test interaksi dengan kontrak yang sudah di-deploy.
 *
 * Usage:
 * 1. Set environment variables:
 *    export STAKING_ADDRESS=0x...
 *    export NFT_ADDRESS=0x...
 *    export GAME_ADDRESS=0x...
 *    export MARKETPLACE_ADDRESS=0x...
 *    export ZONE_VALIDATOR_ADDRESS=0x...  (optional)
 *    export FISH_BAIT_ADDRESS=0x...       (optional)
 *    export FISH_UPGRADE_ADDRESS=0x...    (optional)
 *
 * 2. Run: forge script script/TestInteractions.s.sol:TestInteractions --rpc-url <RPC> --broadcast
 */
contract TestInteractions is Script {
    FishItStaking public staking;
    FishNFT public fishNFT;
    FishingGame public fishingGame;
    FishMarketplace public marketplace;
    ZoneValidator public zoneValidator;
    FishBait public fishBait;
    FishUpgrade public fishUpgrade;

    function setUp() public {
        // Load deployed addresses from environment
        address stakingAddr = vm.envAddress("STAKING_ADDRESS");
        address nftAddr = vm.envAddress("NFT_ADDRESS");
        address gameAddr = vm.envAddress("GAME_ADDRESS");
        address marketplaceAddr = vm.envAddress("MARKETPLACE_ADDRESS");

        staking = FishItStaking(stakingAddr);
        fishNFT = FishNFT(nftAddr);
        fishingGame = FishingGame(gameAddr);
        marketplace = FishMarketplace(marketplaceAddr);

        // Optional addresses (if set)
        try vm.envAddress("ZONE_VALIDATOR_ADDRESS") returns (address zoneValidatorAddr) {
            if (zoneValidatorAddr != address(0)) {
                zoneValidator = ZoneValidator(zoneValidatorAddr);
            }
        } catch {}

        try vm.envAddress("FISH_BAIT_ADDRESS") returns (address fishBaitAddr) {
            if (fishBaitAddr != address(0)) {
                fishBait = FishBait(fishBaitAddr);
            }
        } catch {}

        try vm.envAddress("FISH_UPGRADE_ADDRESS") returns (address fishUpgradeAddr) {
            if (fishUpgradeAddr != address(0)) {
                fishUpgrade = FishUpgrade(fishUpgradeAddr);
            }
        } catch {}
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address user = msg.sender;
        uint256 stakeAmount = 1 ether; // 1 MNT

        console2.log("=== Testing FishIt Interactions ===");
        console2.log("User:", user);

        // Test 1: Stake MNT
        console2.log("\n1. Testing stake...");
        console2.log("   Staking:", stakeAmount);
        staking.stake{value: stakeAmount}();
        console2.log("   Staked successfully");
        console2.log("   User stake:", staking.stakes(user));
        console2.log("   Total staked:", staking.totalStaked());
        console2.log("   License tier:", staking.getLicenseTier(user));

        // Test 2: Check bait prices (from FishBait contract)
        console2.log("\n2. Checking bait prices...");
        if (address(fishBait) != address(0)) {
            uint256 commonPrice = fishBait.getBaitPrice(FishBait.BaitType.Common);
            uint256 rarePrice = fishBait.getBaitPrice(FishBait.BaitType.Rare);
            uint256 epicPrice = fishBait.getBaitPrice(FishBait.BaitType.Epic);
            console2.log("   Common bait:", commonPrice, "wei (1 MNT)");
            console2.log("   Rare bait:", rarePrice, "wei (2 MNT)");
            console2.log("   Epic bait:", epicPrice, "wei (4 MNT)");
        } else {
            console2.log("   Common bait: 1 MNT (hardcoded in FishBait contract)");
            console2.log("   Rare bait: 2 MNT (hardcoded in FishBait contract)");
            console2.log("   Epic bait: 4 MNT (hardcoded in FishBait contract)");
            console2.log("   Note: FISH_BAIT_ADDRESS not set, using default values");
        }

        // Test 3: Check zone requirements (if ZoneValidator address is set)
        if (address(zoneValidator) != address(0)) {
            console2.log("\n3. Checking zone requirements...");
            uint256 zone1EntryFee = zoneValidator.getEntryFee(ZoneValidator.Zone.Shallow);
            uint256 zone3EntryFee = zoneValidator.getEntryFee(ZoneValidator.Zone.DeepSea);
            uint256 zone4EntryFee = zoneValidator.getEntryFee(ZoneValidator.Zone.Abyssal);
            console2.log("   Zone 1 (Shallow) entry fee:", zone1EntryFee, "wei");
            console2.log("   Zone 3 (DeepSea) entry fee:", zone3EntryFee, "wei (1 MNT)");
            console2.log("   Zone 4 (Abyssal) entry fee:", zone4EntryFee, "wei (3 MNT)");
        }

        // Test 4: Purchase bait (if FishBait address is set)
        if (address(fishBait) != address(0)) {
            console2.log("\n4. Testing bait purchase...");
            console2.log("   NOTE: User needs to call fishBait.purchaseBait() with MNT value");
            console2.log("   Example: fishBait.purchaseBait(FishBait.BaitType.Common, 1){value: 1 ether}()");
        }

        // Test 5: Cast line (if VRF configured)
        // Note: Energy system removed - fishing now requires:
        // - Bait purchase from FishBait contract
        // - Zone access validation (license, burn requirements, entry fee)
        if (address(fishingGame.supraRouter()) != address(0)) {
            console2.log("\n5. Testing cast line...");
            console2.log("   Requirements:");
            console2.log("     - Bait: Purchase from FishBait contract first");
            console2.log("     - License: Stake MNT (Zone 1: none, Zone 2: 100 MNT, Zone 3: 250 MNT, Zone 4: 500 MNT)");
            console2.log("     - Burn: Zone 2 (3 Common), Zone 3 (2 Rare), Zone 4 (1 Epic)");
            console2.log("     - Entry fee: Zone 3 (1 MNT), Zone 4 (3 MNT)");
            console2.log("     - Approval: fishNFT.setApprovalForAll(fishingGame, true) for burn");
            console2.log("   Example: fishingGame.castLine(ZoneValidator.Zone.Shallow, FishingGame.BaitType.Common){value: 0}()");
        } else {
            console2.log("\n5. Skipping cast line (VRF not configured)");
        }

        // Test 6: Check NFT collection (if any minted)
        console2.log("\n6. Checking NFT collection...");
        uint256 nextTokenId = fishNFT.nextTokenId();
        console2.log("   Next token ID:", nextTokenId);
        if (nextTokenId > 0) {
            console2.log("   Total NFTs minted:", nextTokenId);
            // Check first NFT
            uint256 firstTokenId = 1;
            address owner = fishNFT.ownerOf(firstTokenId);
            FishNFT.Rarity rarity = fishNFT.rarityOf(firstTokenId);
            FishNFT.Tier tier = fishNFT.tierOf(firstTokenId);
            bool isBurned = fishNFT.isBurned(firstTokenId);
            console2.log("   Token", firstTokenId, "owner:", owner);
            console2.log("   Rarity:", uint256(rarity));
            console2.log("   Tier:", uint256(tier), "(0=Junk, 1=Common, 2=Rare, 3=Epic, 4=Legendary)");
            console2.log("   Is burned:", isBurned);
        }

        // Test 7: Marketplace info
        console2.log("\n7. Checking marketplace...");
        console2.log("   Marketplace fee (bps):", marketplace.FEE_BPS());
        console2.log("   NOTE: All fees go to revenue recipient (no reward pool in controlled economy)");

        // Test 8: Upgrade system (if FishUpgrade address is set)
        if (address(fishUpgrade) != address(0)) {
            console2.log("\n8. Checking upgrade system...");
            console2.log("   Common to Rare: Burn 5 Common, 100% success");
            console2.log("   Rare to Epic: Burn 3 Rare, 40% success (VRF), 60% destroy");
            console2.log("   NOTE: User needs to approve: fishNFT.setApprovalForAll(fishUpgrade, true)");
        }

        console2.log("\n=== Test Summary ===");
        console2.log("Basic interactions tested");
        console2.log("\nNote: Full VRF testing requires Supra VRF setup");
        console2.log("Note: NFT minting requires Supra VRF callback from router");

        vm.stopBroadcast();
    }
}

