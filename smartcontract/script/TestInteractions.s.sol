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
        console2.log("   Energy per day:", staking.computeEnergyPerDay(user));

        // Test 2: Fund reward pool
        console2.log("\n2. Testing reward pool funding...");
        uint256 rewardAmount = 0.1 ether;
        staking.fundRewardPool{value: rewardAmount}();
        console2.log("   Funded reward pool:", rewardAmount);
        console2.log("   Reward pool balance:", staking.rewardPoolBalance());

        // Test 3: Check bait prices
        console2.log("\n3. Checking bait prices...");
        console2.log("   Common bait:", fishingGame.commonBaitPrice());
        console2.log("   Rare bait:", fishingGame.rareBaitPrice());
        console2.log("   Epic bait:", fishingGame.epicBaitPrice());

        // Test 4: Check available energy
        console2.log("\n4. Checking energy...");
        uint256 energy = fishingGame.availableEnergy(user);
        console2.log("   Available energy:", energy);

        // Test 5: Cast line (if energy available and VRF configured)
        if (energy > 0 && address(fishingGame.supraRouter()) != address(0)) {
            console2.log("\n5. Testing cast line...");
            uint256 baitPrice = fishingGame.commonBaitPrice();
            console2.log("   Using common bait, price:", baitPrice);
            
            // Note: This will fail if VRF is not properly configured
            // In testnet, you may need to mock VRF coordinator
            try fishingGame.castLine{value: baitPrice}(FishingGame.BaitType.Common) returns (uint256 requestId) {
                console2.log("   Cast line successful, request ID:", requestId);
            } catch {
                console2.log("   WARNING: Cast line failed (VRF may not be configured)");
            }
        } else {
            console2.log("\n5. Skipping cast line (no energy or VRF not configured)");
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
            uint16 boost = fishNFT.boostBpsOf(firstTokenId);
            console2.log("   Token", firstTokenId, "owner:", owner);
            console2.log("   Rarity:", uint256(rarity));
            console2.log("   Boost (bps):", boost);
        }

        // Test 7: Marketplace info
        console2.log("\n7. Checking marketplace...");
        console2.log("   Marketplace fee (bps):", marketplace.FEE_BPS());
        console2.log("   Fee to reward pool (bps):", marketplace.FEE_TO_REWARD_BPS());

        console2.log("\n=== Test Summary ===");
        console2.log("Basic interactions tested");
        console2.log("\nNote: Full VRF testing requires Supra VRF setup");
        console2.log("Note: NFT minting requires Supra VRF callback from router");

        vm.stopBroadcast();
    }
}

