// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {ZoneValidator} from "../src/ZoneValidator.sol";
import {FishItStaking} from "../src/FishItStaking.sol";
import {FishNFT} from "../src/FishNFT.sol";

contract ZoneValidatorTest is Test {
    ZoneValidator public zoneValidator;
    FishItStaking public staking;
    FishNFT public fishNFT;
    address public admin;
    address public user1;

    function setUp() public {
        admin = address(0x1);
        user1 = address(0x2);

        vm.prank(admin);
        staking = new FishItStaking(admin);

        vm.prank(admin);
        fishNFT = new FishNFT(admin);

        vm.prank(admin);
        zoneValidator = new ZoneValidator(admin, staking, fishNFT);
    }

    // =========================================================================
    // Constructor & Admin Tests
    // =========================================================================

    function test_Constructor_SetsValues() public {
        assertEq(zoneValidator.admin(), admin);
        assertEq(address(zoneValidator.staking()), address(staking));
        assertEq(address(zoneValidator.fishNFT()), address(fishNFT));
    }

    function test_Constructor_InitializesZoneRequirements() public {
        // Zone 1 (Shallow) - no requirements
        assertEq(zoneValidator.getEntryFee(ZoneValidator.Zone.Shallow), 0);
        (FishNFT.Tier tier1, uint256 amount1) = zoneValidator.getBurnRequirement(ZoneValidator.Zone.Shallow);
        assertEq(amount1, 0);
        assertEq(zoneValidator.requiresEpicBaitOnly(ZoneValidator.Zone.Shallow), false);

        // Zone 2 (Reef) - 100 MNT stake, burn 3 Common
        assertEq(zoneValidator.getEntryFee(ZoneValidator.Zone.Reef), 0);
        (tier1, amount1) = zoneValidator.getBurnRequirement(ZoneValidator.Zone.Reef);
        assertEq(uint256(tier1), uint256(FishNFT.Tier.Common));
        assertEq(amount1, 3);
        assertEq(zoneValidator.requiresEpicBaitOnly(ZoneValidator.Zone.Reef), false);

        // Zone 3 (DeepSea) - 250 MNT stake, burn 2 Rare, 1 MNT entry fee
        assertEq(zoneValidator.getEntryFee(ZoneValidator.Zone.DeepSea), 1 ether);
        (tier1, amount1) = zoneValidator.getBurnRequirement(ZoneValidator.Zone.DeepSea);
        assertEq(uint256(tier1), uint256(FishNFT.Tier.Rare));
        assertEq(amount1, 2);
        assertEq(zoneValidator.requiresEpicBaitOnly(ZoneValidator.Zone.DeepSea), false);

        // Zone 4 (Abyssal) - 500 MNT stake, burn 1 Epic, 3 MNT entry fee, 24h cooldown
        assertEq(zoneValidator.getEntryFee(ZoneValidator.Zone.Abyssal), 3 ether);
        (tier1, amount1) = zoneValidator.getBurnRequirement(ZoneValidator.Zone.Abyssal);
        assertEq(uint256(tier1), uint256(FishNFT.Tier.Epic));
        assertEq(amount1, 1);
        assertEq(zoneValidator.requiresEpicBaitOnly(ZoneValidator.Zone.Abyssal), true);
    }

    // =========================================================================
    // Zone Access Validation Tests
    // =========================================================================

    function test_CanAccessZone_Zone1_NoRequirements() public {
        (bool canAccess, string memory reason) = zoneValidator.canAccessZone(user1, ZoneValidator.Zone.Shallow);
        assertTrue(canAccess);
        assertEq(bytes(reason).length, 0);
    }

    function test_CanAccessZone_Zone2_InsufficientStake() public {
        vm.deal(user1, 50 ether);
        vm.prank(user1);
        staking.stake{value: 50 ether}();

        (bool canAccess, string memory reason) = zoneValidator.canAccessZone(user1, ZoneValidator.Zone.Reef);
        assertFalse(canAccess);
        assertEq(reason, "Insufficient stake for license");
    }

    function test_CanAccessZone_Zone2_SufficientStake() public {
        vm.deal(user1, 100 ether);
        vm.prank(user1);
        staking.stake{value: 100 ether}();

        (bool canAccess, string memory reason) = zoneValidator.canAccessZone(user1, ZoneValidator.Zone.Reef);
        assertTrue(canAccess);
        assertEq(bytes(reason).length, 0);
    }

    function test_CanAccessZone_Zone4_CooldownActive() public {
        address mockGame = address(0x99);
        vm.prank(admin);
        zoneValidator.setFishingGame(mockGame);

        vm.deal(user1, 500 ether);
        vm.prank(user1);
        staking.stake{value: 500 ether}();

        // Record zone access (must be called by game)
        vm.prank(mockGame);
        zoneValidator.recordZoneAccess(user1, ZoneValidator.Zone.Abyssal);

        // Try to access immediately - should fail due to cooldown
        (bool canAccess, string memory reason) = zoneValidator.canAccessZone(user1, ZoneValidator.Zone.Abyssal);
        assertFalse(canAccess);
        assertEq(reason, "Zone cooldown active");
    }

    function test_CanAccessZone_Zone4_AfterCooldown() public {
        address mockGame = address(0x99);
        vm.prank(admin);
        zoneValidator.setFishingGame(mockGame);

        vm.deal(user1, 500 ether);
        vm.prank(user1);
        staking.stake{value: 500 ether}();

        // Record zone access (must be called by game)
        vm.prank(mockGame);
        zoneValidator.recordZoneAccess(user1, ZoneValidator.Zone.Abyssal);

        // Fast forward 25 hours (more than 24h cooldown)
        vm.warp(block.timestamp + 25 hours);

        (bool canAccess, string memory reason) = zoneValidator.canAccessZone(user1, ZoneValidator.Zone.Abyssal);
        assertTrue(canAccess);
        assertEq(bytes(reason).length, 0);
    }

    // =========================================================================
    // Entry Fee Tests
    // =========================================================================

    function test_GetEntryFee_Zone1() public {
        assertEq(zoneValidator.getEntryFee(ZoneValidator.Zone.Shallow), 0);
    }

    function test_GetEntryFee_Zone2() public {
        assertEq(zoneValidator.getEntryFee(ZoneValidator.Zone.Reef), 0);
    }

    function test_GetEntryFee_Zone3() public {
        assertEq(zoneValidator.getEntryFee(ZoneValidator.Zone.DeepSea), 1 ether);
    }

    function test_GetEntryFee_Zone4() public {
        assertEq(zoneValidator.getEntryFee(ZoneValidator.Zone.Abyssal), 3 ether);
    }

    // =========================================================================
    // Burn Requirement Tests
    // =========================================================================

    function test_GetBurnRequirement_Zone1() public {
        (FishNFT.Tier tier, uint256 amount) = zoneValidator.getBurnRequirement(ZoneValidator.Zone.Shallow);
        assertEq(amount, 0); // No burn required
    }

    function test_GetBurnRequirement_Zone2() public {
        (FishNFT.Tier tier, uint256 amount) = zoneValidator.getBurnRequirement(ZoneValidator.Zone.Reef);
        assertEq(uint256(tier), uint256(FishNFT.Tier.Common));
        assertEq(amount, 3);
    }

    function test_GetBurnRequirement_Zone3() public {
        (FishNFT.Tier tier, uint256 amount) = zoneValidator.getBurnRequirement(ZoneValidator.Zone.DeepSea);
        assertEq(uint256(tier), uint256(FishNFT.Tier.Rare));
        assertEq(amount, 2);
    }

    function test_GetBurnRequirement_Zone4() public {
        (FishNFT.Tier tier, uint256 amount) = zoneValidator.getBurnRequirement(ZoneValidator.Zone.Abyssal);
        assertEq(uint256(tier), uint256(FishNFT.Tier.Epic));
        assertEq(amount, 1);
    }

    // =========================================================================
    // Epic Bait Only Tests
    // =========================================================================

    function test_RequiresEpicBaitOnly_Zone4() public {
        assertTrue(zoneValidator.requiresEpicBaitOnly(ZoneValidator.Zone.Abyssal));
    }

    function test_RequiresEpicBaitOnly_OtherZones() public {
        assertFalse(zoneValidator.requiresEpicBaitOnly(ZoneValidator.Zone.Shallow));
        assertFalse(zoneValidator.requiresEpicBaitOnly(ZoneValidator.Zone.Reef));
        assertFalse(zoneValidator.requiresEpicBaitOnly(ZoneValidator.Zone.DeepSea));
    }

    // =========================================================================
    // Cooldown Tests
    // =========================================================================

    function test_GetNextAccessTime_NoPreviousAccess() public {
        assertEq(zoneValidator.getNextAccessTime(user1, ZoneValidator.Zone.Abyssal), 0);
    }

    function test_GetNextAccessTime_WithPreviousAccess() public {
        address mockGame = address(0x99);
        vm.prank(admin);
        zoneValidator.setFishingGame(mockGame);

        vm.prank(mockGame);
        zoneValidator.recordZoneAccess(user1, ZoneValidator.Zone.Abyssal);
        uint256 nextAccess = zoneValidator.getNextAccessTime(user1, ZoneValidator.Zone.Abyssal);
        assertEq(nextAccess, block.timestamp + 1 days);
    }

    function test_RecordZoneAccess_OnlyGame() public {
        address mockGame = address(0x99);
        vm.prank(admin);
        zoneValidator.setFishingGame(mockGame);

        vm.prank(mockGame);
        zoneValidator.recordZoneAccess(user1, ZoneValidator.Zone.Abyssal);
        assertEq(zoneValidator.lastZoneAccess(user1, ZoneValidator.Zone.Abyssal), block.timestamp);
    }

    function test_RecordZoneAccess_RevertsIfNotGame() public {
        address mockGame = address(0x99);
        vm.prank(admin);
        zoneValidator.setFishingGame(mockGame);

        vm.expectRevert("Not game");
        vm.prank(user1);
        zoneValidator.recordZoneAccess(user1, ZoneValidator.Zone.Abyssal);
    }

    function test_RecordZoneAccess_EmitsEvent() public {
        address mockGame = address(0x99);
        vm.prank(admin);
        zoneValidator.setFishingGame(mockGame);

        vm.prank(mockGame);
        vm.expectEmit(true, true, false, false);
        emit ZoneValidator.ZoneAccessRecorded(user1, ZoneValidator.Zone.Abyssal, block.timestamp);
        zoneValidator.recordZoneAccess(user1, ZoneValidator.Zone.Abyssal);
    }
}
