// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {FishItStaking} from "../src/FishItStaking.sol";
import {FishNFT} from "../src/FishNFT.sol";
import {FishingGame} from "../src/FishingGame.sol";
import {FishMarketplace} from "../src/FishMarketplace.sol";

/**
 * @title DeployFishIt
 * @notice Deployment script for FishIt protocol contracts.
 *
 * Deployment order:
 * 1. FishItStaking (needs admin)
 * 2. FishNFT (needs owner)
 * 3. FishingGame (needs staking + NFT + revenue recipient)
 * 4. FishMarketplace (needs staking + revenue recipient)
 *
 * Post-deployment wiring:
 * - Staking.setFishingGame(FishingGame)
 * - FishNFT.setFishingGame(FishingGame)
 * - FishingGame.setBaitPrices(...)
 * - FishingGame.setVRFConfig(...) [placeholder for testnet]
 */
contract DeployFishIt is Script {
    // Deployment addresses
    FishItStaking public staking;
    FishNFT public fishNFT;
    FishingGame public fishingGame;
    FishMarketplace public marketplace;

    // Configuration (adjust for testnet/mainnet)
    address public admin; // multisig / deployer for testing
    address public revenueRecipient; // treasury / deployer for testing

    // Bait prices (in wei, adjust for testnet)
    // Mainnet: 0.05 MNT, 0.15 MNT, 0.50 MNT
    // Testnet: use smaller values for testing (e.g., 0.001, 0.003, 0.01 ETH equivalent)
    uint256 public constant COMMON_BAIT_PRICE = 0.05 ether; // 0.05 MNT
    uint256 public constant RARE_BAIT_PRICE = 0.15 ether;   // 0.15 MNT
    uint256 public constant EPIC_BAIT_PRICE = 0.50 ether;   // 0.50 MNT

    // Supra VRF Config (for Mantle Network)
    // Get actual router address from Supra documentation for Mantle
    address public constant SUPRA_ROUTER = address(0); // TODO: Set Supra Router address for Mantle
    uint256 public constant SUPRA_NUM_CONFIRMATIONS = 3; // Number of block confirmations

    function setUp() public {
        // Use deployer as admin/revenue recipient for testing
        // In production, these should be multisig addresses
        admin = msg.sender;
        revenueRecipient = msg.sender;
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console2.log("=== FishIt Protocol Deployment ===");
        console2.log("Deployer:", msg.sender);
        console2.log("Admin:", admin);
        console2.log("Revenue Recipient:", revenueRecipient);

        // Step 1: Deploy FishItStaking
        console2.log("\n1. Deploying FishItStaking...");
        staking = new FishItStaking(admin);
        console2.log("   FishItStaking deployed at:", address(staking));

        // Step 2: Deploy FishNFT
        console2.log("\n2. Deploying FishNFT...");
        fishNFT = new FishNFT(admin);
        console2.log("   FishNFT deployed at:", address(fishNFT));

        // Step 3: Deploy FishingGame
        console2.log("\n3. Deploying FishingGame...");
        fishingGame = new FishingGame(
            admin,
            staking,
            fishNFT,
            revenueRecipient
        );
        console2.log("   FishingGame deployed at:", address(fishingGame));

        // Step 4: Deploy FishMarketplace
        console2.log("\n4. Deploying FishMarketplace...");
        marketplace = new FishMarketplace(
            admin,
            staking,
            revenueRecipient
        );
        console2.log("   FishMarketplace deployed at:", address(marketplace));

        // Step 5: Wire contracts together
        console2.log("\n5. Wiring contracts...");

        // Staking needs to know about FishingGame
        console2.log("   Setting FishingGame in Staking...");
        staking.setFishingGame(address(fishingGame));

        // FishNFT needs to know about FishingGame
        console2.log("   Setting FishingGame in FishNFT...");
        fishNFT.setFishingGame(address(fishingGame));

        // Step 6: Configure FishingGame
        console2.log("\n6. Configuring FishingGame...");

        // Set bait prices
        console2.log("   Setting bait prices...");
        console2.log("     Common:", COMMON_BAIT_PRICE);
        console2.log("     Rare:", RARE_BAIT_PRICE);
        console2.log("     Epic:", EPIC_BAIT_PRICE);
        fishingGame.setBaitPrices(
            COMMON_BAIT_PRICE,
            RARE_BAIT_PRICE,
            EPIC_BAIT_PRICE
        );

        // Set Supra VRF config (update with real Supra Router address)
        console2.log("   Setting Supra VRF config...");
        console2.log("     Router:", SUPRA_ROUTER);
        console2.log("     Confirmations:", SUPRA_NUM_CONFIRMATIONS);
        if (SUPRA_ROUTER != address(0)) {
            fishingGame.setSupraVRFConfig(SUPRA_ROUTER, SUPRA_NUM_CONFIRMATIONS);
        } else {
            console2.log("     WARNING: Supra VRF config skipped (zero address)");
            console2.log("     Update SUPRA_ROUTER with actual Supra Router address for Mantle");
        }

        // Step 7: Summary
        console2.log("\n=== Deployment Summary ===");
        console2.log("FishItStaking:", address(staking));
        console2.log("FishNFT:", address(fishNFT));
        console2.log("FishingGame:", address(fishingGame));
        console2.log("FishMarketplace:", address(marketplace));
        console2.log("\n=== Next Steps ===");
        console2.log("1. Fund reward pool: staking.fundRewardPool{value: amount}()");
        console2.log("2. Update Supra VRF config with real Supra Router address for Mantle");
        console2.log("3. Register wallet with Supra for VRF usage (if required)");
        console2.log("4. Test staking: staking.stake{value: amount}()");
        console2.log("5. Test fishing: fishingGame.castLine{value: baitPrice}(baitType)");
        console2.log("6. Backend should listen to FishCaught events for AI generation");

        vm.stopBroadcast();
    }

    /**
     * @notice Helper function to verify deployment
     */
    function verifyDeployment() external view {
        require(address(staking) != address(0), "Staking not deployed");
        require(address(fishNFT) != address(0), "NFT not deployed");
        require(address(fishingGame) != address(0), "Game not deployed");
        require(address(marketplace) != address(0), "Marketplace not deployed");

        require(staking.fishingGame() == address(fishingGame), "Staking game mismatch");
        require(fishNFT.fishingGame() == address(fishingGame), "NFT game mismatch");
        require(fishingGame.staking() == staking, "Game staking mismatch");
        require(fishingGame.fishNFT() == fishNFT, "Game NFT mismatch");

        console2.log("All contracts wired correctly");
    }
}

