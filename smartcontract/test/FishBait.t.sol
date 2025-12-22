// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {FishBait} from "../src/FishBait.sol";

contract FishBaitTest is Test {
    FishBait public fishBait;
    address public admin;
    address public user1;
    address public user2;

    function setUp() public {
        admin = address(0x1);
        user1 = address(0x2);
        user2 = address(0x3);

        vm.prank(admin);
        fishBait = new FishBait(admin);
    }

    // =========================================================================
    // Constructor & Admin Tests
    // =========================================================================

    function test_Constructor_SetsAdmin() public {
        assertEq(fishBait.admin(), admin);
    }

    function test_Constructor_RevertsIfAdminZero() public {
        vm.expectRevert("Admin zero");
        new FishBait(address(0));
    }

    function test_SetAdmin_OnlyAdmin() public {
        address newAdmin = address(0x5);
        vm.prank(admin);
        fishBait.setAdmin(newAdmin);
        assertEq(fishBait.admin(), newAdmin);
    }

    function test_SetAdmin_RevertsIfNotAdmin() public {
        vm.expectRevert("Not admin");
        vm.prank(user1);
        fishBait.setAdmin(address(0x5));
    }

    function test_SetFishingGame_OnlyAdmin() public {
        address game = address(0x6);
        vm.prank(admin);
        fishBait.setFishingGame(game);
        assertEq(fishBait.fishingGame(), game);
    }

    // =========================================================================
    // Bait Price Tests
    // =========================================================================

    function test_GetBaitPrice_Common() public {
        assertEq(fishBait.getBaitPrice(FishBait.BaitType.Common), 1 ether);
    }

    function test_GetBaitPrice_Rare() public {
        assertEq(fishBait.getBaitPrice(FishBait.BaitType.Rare), 2 ether);
    }

    function test_GetBaitPrice_Epic() public {
        assertEq(fishBait.getBaitPrice(FishBait.BaitType.Epic), 4 ether);
    }

    // =========================================================================
    // Purchase Bait Tests
    // =========================================================================

    function test_PurchaseBait_Common() public {
        vm.deal(user1, 5 ether);

        vm.prank(user1);
        fishBait.purchaseBait{value: 5 ether}(FishBait.BaitType.Common, 5);

        assertEq(fishBait.balanceOf(user1, FishBait.BaitType.Common), 5);
    }

    function test_PurchaseBait_Rare() public {
        vm.deal(user1, 6 ether);

        vm.prank(user1);
        fishBait.purchaseBait{value: 6 ether}(FishBait.BaitType.Rare, 3);

        assertEq(fishBait.balanceOf(user1, FishBait.BaitType.Rare), 3);
    }

    function test_PurchaseBait_Epic() public {
        vm.deal(user1, 8 ether);

        vm.prank(user1);
        fishBait.purchaseBait{value: 8 ether}(FishBait.BaitType.Epic, 2);

        assertEq(fishBait.balanceOf(user1, FishBait.BaitType.Epic), 2);
    }

    function test_PurchaseBait_RevertsIfInsufficientPayment() public {
        vm.deal(user1, 0.5 ether);

        vm.expectRevert("Insufficient payment");
        vm.prank(user1);
        fishBait.purchaseBait{value: 0.5 ether}(FishBait.BaitType.Common, 1);
    }

    function test_PurchaseBait_RefundsExcess() public {
        vm.deal(user1, 3 ether);
        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        fishBait.purchaseBait{value: 3 ether}(FishBait.BaitType.Common, 2); // 2 ether needed

        // Should refund 1 ether
        assertEq(user1.balance, balanceBefore - 2 ether);
    }

    function test_PurchaseBait_EmitsEvent() public {
        vm.deal(user1, 5 ether);

        vm.prank(user1);
        vm.expectEmit(true, true, false, false);
        emit FishBait.BaitPurchased(user1, FishBait.BaitType.Common, 5, 5 ether);
        fishBait.purchaseBait{value: 5 ether}(FishBait.BaitType.Common, 5);
    }

    function test_PurchaseBait_MultipleTypes() public {
        vm.deal(user1, 20 ether);

        vm.prank(user1);
        fishBait.purchaseBait{value: 5 ether}(FishBait.BaitType.Common, 5);

        vm.prank(user1);
        fishBait.purchaseBait{value: 6 ether}(FishBait.BaitType.Rare, 3);

        vm.prank(user1);
        fishBait.purchaseBait{value: 8 ether}(FishBait.BaitType.Epic, 2);

        assertEq(fishBait.balanceOf(user1, FishBait.BaitType.Common), 5);
        assertEq(fishBait.balanceOf(user1, FishBait.BaitType.Rare), 3);
        assertEq(fishBait.balanceOf(user1, FishBait.BaitType.Epic), 2);
    }

    // =========================================================================
    // Consume Bait Tests
    // =========================================================================

    function test_ConsumeBait_OnlyGame() public {
        address game = address(0x7);
        vm.prank(admin);
        fishBait.setFishingGame(game);

        vm.deal(user1, 5 ether);
        vm.prank(user1);
        fishBait.purchaseBait{value: 5 ether}(FishBait.BaitType.Common, 5);

        vm.prank(game);
        fishBait.consumeBait(user1, FishBait.BaitType.Common, 1);

        assertEq(fishBait.balanceOf(user1, FishBait.BaitType.Common), 4);
    }

    function test_ConsumeBait_RevertsIfNotGame() public {
        vm.deal(user1, 5 ether);
        vm.prank(user1);
        fishBait.purchaseBait{value: 5 ether}(FishBait.BaitType.Common, 5);

        vm.expectRevert("Not game");
        vm.prank(user1);
        fishBait.consumeBait(user1, FishBait.BaitType.Common, 1);
    }

    function test_ConsumeBait_RevertsIfInsufficientBait() public {
        address game = address(0x7);
        vm.prank(admin);
        fishBait.setFishingGame(game);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        fishBait.purchaseBait{value: 1 ether}(FishBait.BaitType.Common, 1);

        vm.expectRevert("Insufficient bait");
        vm.prank(game);
        fishBait.consumeBait(user1, FishBait.BaitType.Common, 2);
    }

    function test_ConsumeBait_EmitsEvent() public {
        address game = address(0x7);
        vm.prank(admin);
        fishBait.setFishingGame(game);

        vm.deal(user1, 5 ether);
        vm.prank(user1);
        fishBait.purchaseBait{value: 5 ether}(FishBait.BaitType.Common, 5);

        vm.prank(game);
        vm.expectEmit(true, true, false, false);
        emit FishBait.BaitConsumed(user1, FishBait.BaitType.Common, 1);
        fishBait.consumeBait(user1, FishBait.BaitType.Common, 1);
    }

    function test_ConsumeBait_MultipleTimes() public {
        address game = address(0x7);
        vm.prank(admin);
        fishBait.setFishingGame(game);

        vm.deal(user1, 5 ether);
        vm.prank(user1);
        fishBait.purchaseBait{value: 5 ether}(FishBait.BaitType.Common, 5);

        vm.prank(game);
        fishBait.consumeBait(user1, FishBait.BaitType.Common, 1);

        vm.prank(game);
        fishBait.consumeBait(user1, FishBait.BaitType.Common, 2);

        assertEq(fishBait.balanceOf(user1, FishBait.BaitType.Common), 2);
    }
}
