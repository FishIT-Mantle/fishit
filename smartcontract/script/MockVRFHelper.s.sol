// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

// Interface to talk to the Mock Router (0x214F...)
interface IMockSupraRouter {
    function fulfillRequest(address _consumer, uint256 _requestId, uint256[] memory _rngList) external;
}

contract MockVRFHelper is Script {
    // Addresses retrieved from your logs (Checksummed)
    address constant ROUTER_ADDRESS = 0x88377eA4eb0841E8DA11852E67732a08D559d852;
    
    // FIXED: Updated to correct checksum format (0xE72C...)
    address constant GAME_ADDRESS   = 0xE72C38663d6D55571b612E2b13Bb487Bc080Dac4;

    IMockSupraRouter router;

    function setUp() public {
        router = IMockSupraRouter(ROUTER_ADDRESS);
    }

    function run() public {
        vm.startBroadcast();

        // 1. Prepare generic random number
        uint256[] memory rng = new uint256[](1);
        rng[0] = 55555; 

        console2.log("Attempting to fulfill requests on router:", ROUTER_ADDRESS);

        // 2. Loop through IDs 1-10 to find and unblock ANY pending request
        for (uint256 i = 1; i <= 10; i++) {
            try router.fulfillRequest(GAME_ADDRESS, i, rng) {
                console2.log(unicode"✅ Successfully fulfilled request ID:", i);
            } catch {
                // Ignore errors for IDs that don't exist yet
            }
        }

        vm.stopBroadcast();
    }

    // -----------------------------------------------------------------------
    // Helper: Targeted Rarity
    // -----------------------------------------------------------------------
    function fulfillForRarity(uint256 requestId, uint8 rarityTarget) internal {
        uint256 randomWord;

        if (rarityTarget == 0) {
            randomWord = 5000; // Common
        } else if (rarityTarget == 1) {
            randomWord = 8000; // Rare
        } else if (rarityTarget == 2) {
            randomWord = 9700; // Epic
        } else {
            randomWord = 9999; // Legendary
        }

        uint256[] memory rng = new uint256[](1);
        rng[0] = randomWord;

        router.fulfillRequest(GAME_ADDRESS, requestId, rng);
        console2.log(unicode"✅ Targeted fulfillment for Request ID:", requestId);
    }
}