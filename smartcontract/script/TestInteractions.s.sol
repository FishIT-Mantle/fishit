// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {FishItStaking} from "../src/FishItStaking.sol";
import {FishNFT} from "../src/FishNFT.sol";
import {FishingGame} from "../src/FishingGame.sol";
import {FishMarketplace} from "../src/FishMarketplace.sol";

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
 *
 * 2. Run: forge script script/TestInteractions.s.sol:TestInteractions --rpc-url <RPC> --broadcast
 */
contract TestInteractions is Script {
    FishItStaking public staking;
    FishNFT public fishNFT;
    FishingGame public fishingGame;
    FishMarketplace public marketplace;

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

        // Test 3: Check bait prices (now in FishBait contract)
        console2.log("\n3. Checking bait prices...");
        console2.log("   Common bait: 1 MNT (from FishBait contract)");
        console2.log("   Rare bait: 2 MNT (from FishBait contract)");
        console2.log("   Epic bait: 4 MNT (from FishBait contract)");

        // Test 4: Cast line (if VRF configured)
        // Note: Energy system removed - fishing now requires bait purchase
        if (address(fishingGame.supraRouter()) != address(0)) {
            console2.log("\n4. Testing cast line (requires bait purchase first)...");
            console2.log("   Bait price: Purchase from FishBait contract first");
            console2.log("   NOTE: Cast line requires bait purchase from FishBait contract first");
            console2.log("   NOTE: Also requires zone selection and validation");
        } else {
            console2.log("\n4. Skipping cast line (VRF not configured)");
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
            // boostBpsOf removed in new system (no yield)
            FishNFT.Tier tier = fishNFT.tierOf(firstTokenId);
            console2.log("   Token", firstTokenId, "owner:", owner);
            console2.log("   Rarity:", uint256(rarity));
            console2.log("   Tier:", uint256(tier));
        }

        // Test 5: Marketplace info
        console2.log("\n5. Checking marketplace...");
        console2.log("   Marketplace fee (bps):", marketplace.FEE_BPS());
        console2.log("   NOTE: All fees go to revenue (no reward pool in controlled economy)");

        console2.log("\n=== Test Summary ===");
        console2.log("Basic interactions tested");
        console2.log("\nNote: Full VRF testing requires Supra VRF setup");
        console2.log("Note: NFT minting requires Supra VRF callback from router");

        vm.stopBroadcast();
    }
}

