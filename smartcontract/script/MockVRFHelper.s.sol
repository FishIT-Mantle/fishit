// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {FishingGame} from "../src/FishingGame.sol";

/**
 * @title MockSupraVRFHelper
 * @notice Helper script untuk testing lokal dengan mock Supra Router.
 *
 * Untuk testing lokal tanpa Supra VRF, gunakan mock router ini.
 * Set Supra Router ke address script ini, lalu call fulfillRequest secara manual.
 *
 * Usage:
 * 1. Deploy script ini sebagai mock Supra Router
 * 2. Set Supra VRF config di FishingGame dengan address script ini
 * 3. Setelah castLine, call fulfillRequest secara manual
 */
contract MockSupraVRFHelper is Script {
    FishingGame public fishingGame;

    function setUp() public {
        address gameAddr = vm.envAddress("GAME_ADDRESS");
        fishingGame = FishingGame(gameAddr);
    }

    /**
     * @notice Fulfill Supra VRF request dengan random number manual
     * @param requestId Request ID dari castLine
     * @param randomWord Random number untuk testing (0-2^256-1)
     */
    function fulfillVRFRequest(uint256 requestId, uint256 randomWord) public {
        // Create rngList array for Supra callback
        uint256[] memory rngList = new uint256[](1);
        rngList[0] = randomWord;
        
        // Simulate Supra Router calling back
        fishingGame.supraVRFCallback(requestId, rngList, 0);
        console2.log("Fulfilled Supra VRF request", requestId, "with random:", randomWord);
    }

    /**
     * @notice Helper untuk test dengan random number yang predictable
     * @param requestId Request ID dari castLine
     * @param rarityTarget Target rarity untuk testing (0=Common, 1=Rare, 2=Epic, 3=Legendary)
     */
    function fulfillForRarity(uint256 requestId, uint8 rarityTarget) public {
        // Generate random number yang akan menghasilkan rarity tertentu
        // Common bait probabilities: 70% C, 25% R, 4.5% E, 0.5% L
        uint256 randomWord;
        
        if (rarityTarget == 0) {
            // Common: roll < 7000
            randomWord = 5000;
        } else if (rarityTarget == 1) {
            // Rare: 7000 <= roll < 9500
            randomWord = 8000;
        } else if (rarityTarget == 2) {
            // Epic: 9500 <= roll < 9950
            randomWord = 9700;
        } else {
            // Legendary: roll >= 9950
            randomWord = 9999;
        }

        fulfillVRFRequest(requestId, randomWord);
    }
}

