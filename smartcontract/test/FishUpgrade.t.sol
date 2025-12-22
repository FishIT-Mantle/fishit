// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {FishUpgrade} from "../src/FishUpgrade.sol";
import {FishNFT} from "../src/FishNFT.sol";
import {MockSupraRouter} from "./mocks/MockSupraRouter.sol";

contract FishUpgradeTest is Test {
    FishUpgrade public fishUpgrade;
    FishNFT public fishNFT;
    MockSupraRouter public mockSupraRouter;
    address public admin;
    address public user1;
    address public fishingGame;

    function setUp() public {
        admin = address(0x1);
        user1 = address(0x2);
        fishingGame = address(0x3);

        vm.prank(admin);
        fishNFT = new FishNFT(admin);

        vm.prank(admin);
        fishUpgrade = new FishUpgrade(admin, fishNFT);

        // Wire contracts
        vm.prank(admin);
        fishNFT.setFishingGame(fishingGame);

        vm.prank(admin);
        fishNFT.setUpgradeContract(address(fishUpgrade));

        // Deploy mock Supra Router
        mockSupraRouter = new MockSupraRouter();

        // Set VRF config
        vm.prank(admin);
        fishUpgrade.setSupraVRFConfig(address(mockSupraRouter), 3);
    }

    // =========================================================================
    // Constructor & Admin Tests
    // =========================================================================

    function test_Constructor_SetsValues() public {
        assertEq(fishUpgrade.admin(), admin);
        assertEq(address(fishUpgrade.fishNFT()), address(fishNFT));
    }

    function test_Constructor_RevertsIfAdminZero() public {
        vm.expectRevert("Admin zero");
        new FishUpgrade(address(0), fishNFT);
    }

    function test_Constructor_RevertsIfNFTZero() public {
        vm.expectRevert("NFT zero");
        new FishUpgrade(admin, FishNFT(address(0)));
    }

    function test_SetAdmin_OnlyAdmin() public {
        address newAdmin = address(0x5);
        vm.prank(admin);
        fishUpgrade.setAdmin(newAdmin);
        assertEq(fishUpgrade.admin(), newAdmin);
    }

    function test_SetSupraVRFConfig_OnlyAdmin() public {
        MockSupraRouter newRouter = new MockSupraRouter();
        vm.prank(admin);
        fishUpgrade.setSupraVRFConfig(address(newRouter), 5);
        assertEq(address(fishUpgrade.supraRouter()), address(newRouter));
        assertEq(fishUpgrade.supraNumConfirmations(), 5);
    }

    // =========================================================================
    // Common → Rare Upgrade Tests (100% success)
    // =========================================================================

    function test_UpgradeCommonToRare_Works() public {
        // Mint 5 Common fish for user
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Common);
        }

        // Approve upgrade contract
        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishUpgrade), true);

        uint256 balanceBefore = fishNFT.balanceOf(user1);

        // Upgrade
        uint256[] memory tokenIds = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            tokenIds[i] = i + 1;
        }

        vm.prank(user1);
        fishUpgrade.upgradeCommonToRare(tokenIds);

        // Should have 1 Rare NFT (5 Common burned, 1 Rare minted)
        assertEq(fishNFT.balanceOf(user1), balanceBefore - 4); // 5 burned, 1 minted = net -4
        assertEq(uint256(fishNFT.tierOf(6)), uint256(FishNFT.Tier.Rare)); // New token ID is 6
    }

    function test_UpgradeCommonToRare_RevertsIfWrongCount() public {
        // Mint 5 Common fish
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Common);
        }

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishUpgrade), true);

        uint256[] memory tokenIds = new uint256[](3); // Wrong count

        vm.expectRevert("Wrong count");
        vm.prank(user1);
        fishUpgrade.upgradeCommonToRare(tokenIds);
    }

    function test_UpgradeCommonToRare_RevertsIfNotAuthorized() public {
        // Mint 5 Common fish for user1
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Common);
        }

        // user1 tries to upgrade without approval
        uint256[] memory tokenIds = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            tokenIds[i] = i + 1;
        }

        vm.expectRevert("Not authorized");
        vm.prank(user1);
        fishUpgrade.upgradeCommonToRare(tokenIds);
    }

    function test_UpgradeCommonToRare_EmitsEvent() public {
        // Mint 5 Common fish
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Common);
        }

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishUpgrade), true);

        uint256[] memory tokenIds = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            tokenIds[i] = i + 1;
        }

        vm.prank(user1);
        vm.expectEmit(true, true, true, false);
        emit FishUpgrade.UpgradeSucceeded(
            user1,
            FishUpgrade.UpgradeType.CommonToRare,
            6, // New token ID
            tokenIds
        );
        fishUpgrade.upgradeCommonToRare(tokenIds);
    }

    // =========================================================================
    // Rare → Epic Upgrade Tests (40% success via VRF)
    // =========================================================================

    function test_UpgradeRareToEpic_RequestVRF() public {
        // Mint 3 Rare fish
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Rare);
        }

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishUpgrade), true);

        uint256[] memory tokenIds = new uint256[](3);
        for (uint256 i = 0; i < 3; i++) {
            tokenIds[i] = i + 1;
        }

        vm.prank(user1);
        uint256 requestId = fishUpgrade.upgradeRareToEpic(tokenIds);

        assertGt(requestId, 0);
        
        // Check request stored
        (address reqUser, uint256[] memory reqTokenIds) = fishUpgrade.getUpgradeRequest(requestId);
        assertEq(reqUser, user1);
        assertEq(reqTokenIds.length, 3);
    }

    function test_UpgradeRareToEpic_SuccessCase() public {
        // Mint 3 Rare fish
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Rare);
        }

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishUpgrade), true);

        uint256[] memory tokenIds = new uint256[](3);
        for (uint256 i = 0; i < 3; i++) {
            tokenIds[i] = i + 1;
        }

        vm.prank(user1);
        uint256 requestId = fishUpgrade.upgradeRareToEpic(tokenIds);

        uint256 balanceBefore = fishNFT.balanceOf(user1);

        // Fulfill with success roll (< 4000 = 40% success)
        uint256[] memory rngList = new uint256[](1);
        rngList[0] = 3000; // < 4000 = success
        mockSupraRouter.fulfillRequest(requestId, rngList, 0);

        // Should have 1 Epic NFT (3 Rare burned, 1 Epic minted)
        assertEq(fishNFT.balanceOf(user1), balanceBefore - 2); // 3 burned, 1 minted = net -2
        assertEq(uint256(fishNFT.tierOf(4)), uint256(FishNFT.Tier.Epic));
    }

    function test_UpgradeRareToEpic_FailureCase() public {
        // Mint 3 Rare fish
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Rare);
        }

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishUpgrade), true);

        uint256[] memory tokenIds = new uint256[](3);
        for (uint256 i = 0; i < 3; i++) {
            tokenIds[i] = i + 1;
        }

        vm.prank(user1);
        uint256 requestId = fishUpgrade.upgradeRareToEpic(tokenIds);

        uint256 balanceBefore = fishNFT.balanceOf(user1);

        // Fulfill with failure roll (>= 4000 = 60% failure)
        uint256[] memory rngList = new uint256[](1);
        rngList[0] = 5000; // >= 4000 = failure
        mockSupraRouter.fulfillRequest(requestId, rngList, 0);

        // Should have no Epic NFT (3 Rare burned, nothing minted)
        assertEq(fishNFT.balanceOf(user1), balanceBefore - 3); // 3 burned, 0 minted = net -3
    }

    function test_UpgradeRareToEpic_RevertsIfWrongCount() public {
        // Mint 3 Rare fish
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Rare);
        }

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishUpgrade), true);

        uint256[] memory tokenIds = new uint256[](2); // Wrong count

        vm.expectRevert("Wrong count");
        vm.prank(user1);
        fishUpgrade.upgradeRareToEpic(tokenIds);
    }

    function test_UpgradeRareToEpic_RevertsIfVRFNotConfigured() public {
        // Create new upgrade contract without VRF config
        vm.prank(admin);
        FishUpgrade newUpgrade = new FishUpgrade(admin, fishNFT);
        
        // Mint 3 Rare fish
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Rare);
        }

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(newUpgrade), true);

        uint256[] memory tokenIds = new uint256[](3);
        for (uint256 i = 0; i < 3; i++) {
            tokenIds[i] = i + 1;
        }

        // Should revert because VRF not configured
        vm.expectRevert("VRF not configured");
        vm.prank(user1);
        newUpgrade.upgradeRareToEpic(tokenIds);
    }

    // =========================================================================
    // View Function Tests
    // =========================================================================

    function test_CanUpgradeCommonToRare_ReturnsTrue() public {
        // Mint 5 Common fish
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Common);
        }

        (bool canUpgrade, uint256[] memory tokenIds) = fishUpgrade.canUpgradeCommonToRare(user1);
        assertTrue(canUpgrade);
        assertEq(tokenIds.length, 5);
    }

    function test_CanUpgradeCommonToRare_ReturnsFalse() public {
        // Mint only 3 Common fish
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Common);
        }

        (bool canUpgrade, uint256[] memory tokenIds) = fishUpgrade.canUpgradeCommonToRare(user1);
        assertFalse(canUpgrade);
    }

    function test_CanUpgradeRareToEpic_ReturnsTrue() public {
        // Mint 3 Rare fish
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(fishingGame);
            fishNFT.mintFish(user1, FishNFT.Tier.Rare);
        }

        (bool canUpgrade, uint256[] memory tokenIds) = fishUpgrade.canUpgradeRareToEpic(user1);
        assertTrue(canUpgrade);
        assertEq(tokenIds.length, 3);
    }
}
