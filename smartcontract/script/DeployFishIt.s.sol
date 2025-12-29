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
 * @title DeployFishIt
 * @notice Deployment script for FishIt protocol contracts.
 *
 * Deployment order:
 * 1. FishItStaking (needs admin)
 * 2. FishNFT (needs owner)
 * 3. ZoneValidator (needs staking + NFT)
 * 4. FishBait (needs admin)
 * 5. FishingGame (needs staking + NFT + zoneValidator + fishBait + revenue recipient)
 * 6. FishUpgrade (needs admin + NFT)
 * 7. FishMarketplace (needs admin + revenue recipient)
 *
 * Post-deployment wiring:
 * - zoneValidator.setFishingGame(FishingGame)
 * - fishBait.setFishingGame(FishingGame)
 * - fishNFT.setFishingGame(FishingGame)
 * - fishNFT.setUpgradeContract(FishUpgrade)
 * - fishingGame.setSupraVRFConfig(...) [requires Supra Router address]
 * - fishUpgrade.setSupraVRFConfig(...) [requires Supra Router address]
 */
contract DeployFishIt is Script {
    // Deployment addresses
    FishItStaking public staking;
    FishNFT public fishNFT;
    ZoneValidator public zoneValidator;
    FishBait public fishBait;
    FishingGame public fishingGame;
    FishUpgrade public fishUpgrade;
    FishMarketplace public marketplace;

    // Configuration (adjust for testnet/mainnet)
    address public admin; // multisig / deployer for testing
    address public revenueRecipient; // treasury / deployer for testing

    // Bait prices are hardcoded in FishBait.sol contract:
    // - Common: 1 MNT (1 ether)
    // - Rare: 2 MNT (2 ether)
    // - Epic: 4 MNT (4 ether)
    // No need to set prices here, they're set in the contract

    // Supra VRF Config (for Mantle Network)
    // Get actual router address from Supra documentation for Mantle
    // Can be set via SUPRA_ROUTER_ADDRESS environment variable
    // Default to zero address if not set (VRF config will be skipped)

    function setUp() public {
        // setUp runs before broadcast, so we'll set admin/revenueRecipient in run() instead
    }

    function run() public {
        // When --private-key is provided in forge script command line, use vm.startBroadcast() without parameter
        // The private key from command line will be used automatically for signing transactions
        vm.startBroadcast();

        // After vm.startBroadcast(), msg.sender is the deployer address
        // Use msg.sender directly to ensure it matches the address used for all transactions
        address deployerAdmin = msg.sender;
        address deployerRevenueRecipient = msg.sender;

        console2.log("=== FishIt Protocol Deployment ===");
        console2.log("Deployer (msg.sender):", msg.sender);
        console2.log("Admin:", deployerAdmin);
        console2.log("Revenue Recipient:", deployerRevenueRecipient);

        // Step 1: Deploy FishItStaking
        // Use msg.sender directly to ensure it matches the admin set in constructor
        console2.log("\n1. Deploying FishItStaking...");
        console2.log("   Using msg.sender as admin:", msg.sender);
        staking = new FishItStaking(msg.sender);
        console2.log("   FishItStaking deployed at:", address(staking));
        console2.log("   FishItStaking admin:", staking.admin());

        // Step 2: Deploy FishNFT
        console2.log("\n2. Deploying FishNFT...");
        console2.log("   Using msg.sender as admin:", msg.sender);
        fishNFT = new FishNFT(msg.sender);
        console2.log("   FishNFT deployed at:", address(fishNFT));
        console2.log("   FishNFT owner:", fishNFT.owner());

        // Step 3: Deploy ZoneValidator
        console2.log("\n3. Deploying ZoneValidator...");
        console2.log("   Using msg.sender as admin:", msg.sender);
        zoneValidator = new ZoneValidator(msg.sender, staking, fishNFT);
        console2.log("   ZoneValidator deployed at:", address(zoneValidator));
        console2.log("   ZoneValidator admin:", zoneValidator.admin());

        // Step 4: Deploy FishBait
        console2.log("\n4. Deploying FishBait...");
        console2.log("   Using msg.sender as admin:", msg.sender);
        fishBait = new FishBait(msg.sender);
        console2.log("   FishBait deployed at:", address(fishBait));
        console2.log("   FishBait admin:", fishBait.admin());

        // Step 5: Deploy FishingGame
        console2.log("\n5. Deploying FishingGame...");
        console2.log("   Using msg.sender as admin:", msg.sender);
        fishingGame = new FishingGame(
            msg.sender,
            staking,
            fishNFT,
            zoneValidator,
            fishBait,
            msg.sender
        );
        console2.log("   FishingGame deployed at:", address(fishingGame));
        console2.log("   FishingGame admin:", fishingGame.admin());

        // Wire contracts to FishingGame
        // Note: msg.sender is already admin after vm.startBroadcast(), no prank needed
        console2.log("\n   Wiring ZoneValidator to FishingGame...");
        console2.log("   ZoneValidator admin:", zoneValidator.admin());
        console2.log("   Current msg.sender:", msg.sender);
        zoneValidator.setFishingGame(address(fishingGame));
        console2.log("    \u2713 ZoneValidator.setFishingGame() successful");

        console2.log("   Wiring FishBait to FishingGame...");
        console2.log("   FishBait admin:", fishBait.admin());
        fishBait.setFishingGame(address(fishingGame));
        console2.log("    \u2713 FishBait.setFishingGame() successful");

        // Step 6: Deploy FishUpgrade
        console2.log("\n6. Deploying FishUpgrade...");
        console2.log("   Using msg.sender as admin:", msg.sender);
        fishUpgrade = new FishUpgrade(msg.sender, fishNFT);
        console2.log("   FishUpgrade deployed at:", address(fishUpgrade));
        console2.log("   FishUpgrade admin:", fishUpgrade.admin());

        // Wire FishNFT to allow FishUpgrade to mint
        // Note: msg.sender is already admin after vm.startBroadcast(), no prank needed
        console2.log("   Setting upgrade contract in FishNFT...");
        console2.log("   FishNFT owner:", fishNFT.owner());
        console2.log("   Current msg.sender:", msg.sender);
        fishNFT.setUpgradeContract(address(fishUpgrade));
        console2.log("    \u2713 FishNFT.setUpgradeContract() successful");

        // Step 7: Deploy FishMarketplace
        console2.log("\n7. Deploying FishMarketplace...");
        console2.log("   Using msg.sender as admin:", msg.sender);
        marketplace = new FishMarketplace(
            msg.sender,
            msg.sender
        );
        console2.log("   FishMarketplace deployed at:", address(marketplace));

        // Step 8: Wire contracts together
        console2.log("\n8. Wiring contracts...");

        // FishNFT needs to know about FishingGame
        console2.log("   Setting FishingGame in FishNFT...");
        console2.log("   FishNFT owner:", fishNFT.owner());
        console2.log("   Current msg.sender:", msg.sender);
        // Note: msg.sender is already admin after vm.startBroadcast(), no prank needed
        fishNFT.setFishingGame(address(fishingGame));
        console2.log("    \u2713 FishNFT.setFishingGame() successful");

        // Step 9: Configure contracts
        console2.log("\n9. Configuring contracts...");

        // Note: Bait prices are now set in FishBait contract (1, 2, 4 MNT)
        console2.log("   Bait prices are set in FishBait contract:");
        console2.log("     Common: 1 MNT");
        console2.log("     Rare: 2 MNT");
        console2.log("     Epic: 4 MNT");

        // Set Supra VRF config for FishingGame (if configured)
        address supraRouter;
        uint256 supraConfirmations = 3; // Default confirmations
        try vm.envAddress("SUPRA_ROUTER_ADDRESS") returns (address router) {
            supraRouter = router;
            try vm.envUint("SUPRA_NUM_CONFIRMATIONS") returns (
                uint256 confirmations
            ) {
                supraConfirmations = confirmations;
            } catch {}
        } catch {}
        console2.log("   Setting Supra VRF config for FishingGame...");
        console2.log("     Router:", supraRouter);
        console2.log("     Confirmations:", supraConfirmations);
        if (supraRouter != address(0)) {
            fishingGame.setSupraVRFConfig(supraRouter, supraConfirmations);
            console2.log("     \u2713 VRF config set for FishingGame");
        } else {
            console2.log(
                "     WARNING: Supra VRF config skipped (SUPRA_ROUTER_ADDRESS not set)"
            );
            console2.log(
                "     Update SUPRA_ROUTER_ADDRESS in .env with actual Supra Router address for Mantle"
            );
        }

        // Set Supra VRF config for FishUpgrade (for Rare → Epic 40% success rate)
        console2.log("   Setting Supra VRF config for FishUpgrade...");
        if (supraRouter != address(0)) {
            fishUpgrade.setSupraVRFConfig(supraRouter, supraConfirmations);
            console2.log("     \u2713 VRF config set for FishUpgrade");
        } else {
            console2.log(
                "     WARNING: Supra VRF config skipped (SUPRA_ROUTER_ADDRESS not set)"
            );
        }

        // Step 10: Summary
        console2.log("\n=== Deployment Summary ===");
        console2.log("FishItStaking:", address(staking));
        console2.log("FishNFT:", address(fishNFT));
        console2.log("ZoneValidator:", address(zoneValidator));
        console2.log("FishBait:", address(fishBait));
        console2.log("FishingGame:", address(fishingGame));
        console2.log("FishUpgrade:", address(fishUpgrade));
        console2.log("FishMarketplace:", address(marketplace));
        console2.log("\n=== Explorer Links (Mantle Sepolia Testnet) ===");
        console2.log("Explorer Base: https://explorer.sepolia.mantle.xyz/address/");
        console2.log("FishItStaking:", address(staking));
        console2.log("FishNFT:", address(fishNFT));
        console2.log("ZoneValidator:", address(zoneValidator));
        console2.log("FishBait:", address(fishBait));
        console2.log("FishingGame:", address(fishingGame));
        console2.log("FishUpgrade:", address(fishUpgrade));
        console2.log("FishMarketplace:", address(marketplace));
        console2.log("\n=== Next Steps ===");
        console2.log(
            "1. Update Supra VRF config with real Supra Router address for Mantle"
        );
        console2.log(
            "2. Register wallet with Supra for VRF usage (if required)"
        );
        console2.log("3. Test staking: staking.stake{value: amount}()");
        console2.log(
            "4. Purchase bait: fishBait.purchaseBait(baitType, amount){value: cost}()"
        );
        console2.log("5. Approve contracts to burn NFTs:");
        console2.log(
            "   - fishNFT.setApprovalForAll(fishingGame, true) // For zone access"
        );
        console2.log(
            "   - fishNFT.setApprovalForAll(fishUpgrade, true) // For upgrades"
        );
        console2.log(
            "6. Test fishing: fishingGame.castLine(zone, baitType){value: entryFee}()"
        );
        console2.log(
            "7. Test upgrade: fishUpgrade.upgradeCommonToRare(tokenIds) or upgradeRareToEpic(tokenIds)"
        );
        console2.log(
            "8. Backend should listen to FishCaught and Upgrade events for tracking"
        );

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

        // staking.fishingGame() removed - not needed in new system
        require(
            fishNFT.fishingGame() == address(fishingGame),
            "NFT game mismatch"
        );
        require(fishingGame.staking() == staking, "Game staking mismatch");
        require(fishingGame.fishNFT() == fishNFT, "Game NFT mismatch");

        console2.log("All contracts wired correctly");
    }
}
