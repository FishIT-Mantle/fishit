// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {FishItStaking} from "../src/FishItStaking.sol";

contract FishItStakingTest is Test {
    FishItStaking public staking;
    address public admin;
    address public user1;
    address public user2;

    uint256 public constant STAKE_AMOUNT = 1 ether;

    function setUp() public {
        admin = address(0x1);
        user1 = address(0x2);
        user2 = address(0x3);

        vm.prank(admin);
        staking = new FishItStaking(admin);
    }

    // =========================================================================
    // Constructor & Admin Tests
    // =========================================================================

    function test_Constructor_SetsAdmin() public {
        assertEq(staking.admin(), admin);
    }

    function test_Constructor_RevertsIfAdminZero() public {
        vm.expectRevert("Admin zero");
        new FishItStaking(address(0));
    }

    function test_SetAdmin_OnlyAdmin() public {
        address newAdmin = address(0x5);
        vm.prank(admin);
        staking.setAdmin(newAdmin);
        assertEq(staking.admin(), newAdmin);
    }

    function test_SetAdmin_RevertsIfNotAdmin() public {
        vm.expectRevert("Not admin");
        vm.prank(user1);
        staking.setAdmin(address(0x5));
    }

    // =========================================================================
    // Staking Tests
    // =========================================================================

    function test_Stake_UpdatesStake() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        assertEq(staking.stakes(user1), STAKE_AMOUNT);
        assertEq(staking.totalStaked(), STAKE_AMOUNT);
    }

    function test_Stake_EmitsEvent() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit FishItStaking.Staked(user1, STAKE_AMOUNT, 0); // License tier 0 (< 100 MNT)
        staking.stake{value: STAKE_AMOUNT}();
    }

    function test_Stake_UpdatesLicenseTier() public {
        vm.deal(user1, 500 ether);

        // Stake 100 MNT -> License I (tier 1)
        vm.prank(user1);
        staking.stake{value: 100 ether}();
        assertEq(staking.getLicenseTier(user1), 1);

        // Add 150 MNT more -> License II (tier 2)
        vm.prank(user1);
        staking.stake{value: 150 ether}();
        assertEq(staking.getLicenseTier(user1), 2);

        // Add 250 MNT more -> License III (tier 3)
        vm.prank(user1);
        staking.stake{value: 250 ether}();
        assertEq(staking.getLicenseTier(user1), 3);
    }

    function test_Stake_RevertsIfZeroAmount() public {
        vm.expectRevert("Zero amount");
        vm.prank(user1);
        staking.stake{value: 0}();
    }

    function test_Stake_UpdatesTotalStaked() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.deal(user2, STAKE_AMOUNT);

        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();
        assertEq(staking.totalStaked(), STAKE_AMOUNT);

        vm.prank(user2);
        staking.stake{value: STAKE_AMOUNT}();
        assertEq(staking.totalStaked(), STAKE_AMOUNT * 2);
    }

    // =========================================================================
    // License Tier Tests
    // =========================================================================

    function test_GetLicenseTier_NoStake() public {
        assertEq(staking.getLicenseTier(user1), 0);
    }

    function test_GetLicenseTier_LessThan100() public {
        vm.deal(user1, 50 ether);
        vm.prank(user1);
        staking.stake{value: 50 ether}();
        assertEq(staking.getLicenseTier(user1), 0); // No license
    }

    function test_GetLicenseTier_LicenseI() public {
        vm.deal(user1, 100 ether);
        vm.prank(user1);
        staking.stake{value: 100 ether}();
        assertEq(staking.getLicenseTier(user1), 1); // License I (Zone 2)
    }

    function test_GetLicenseTier_LicenseII() public {
        vm.deal(user1, 250 ether);
        vm.prank(user1);
        staking.stake{value: 250 ether}();
        assertEq(staking.getLicenseTier(user1), 2); // License II (Zone 3)
    }

    function test_GetLicenseTier_LicenseIII() public {
        vm.deal(user1, 500 ether);
        vm.prank(user1);
        staking.stake{value: 500 ether}();
        assertEq(staking.getLicenseTier(user1), 3); // License III (Zone 4)
    }

    // =========================================================================
    // Unstake Tests (with cooldown)
    // =========================================================================

    function test_RequestUnstake_Works() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        staking.requestUnstake(STAKE_AMOUNT);

        (uint256 amount, uint256 availableAt) = staking.getUnstakeRequest(user1);
        assertEq(amount, STAKE_AMOUNT);
        assertEq(availableAt, block.timestamp + 3 days);
    }

    function test_RequestUnstake_EmitsEvent() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit FishItStaking.UnstakeRequested(user1, STAKE_AMOUNT, block.timestamp + 3 days);
        staking.requestUnstake(STAKE_AMOUNT);
    }

    function test_RequestUnstake_RevertsIfNoStake() public {
        vm.expectRevert("Insufficient stake");
        vm.prank(user1);
        staking.requestUnstake(STAKE_AMOUNT);
    }

    function test_RequestUnstake_RevertsIfAlreadyRequested() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        staking.requestUnstake(STAKE_AMOUNT);

        vm.expectRevert("Unstake already requested");
        vm.prank(user1);
        staking.requestUnstake(STAKE_AMOUNT);
    }

    function test_ExecuteUnstake_RevertsIfCooldownActive() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        staking.requestUnstake(STAKE_AMOUNT);

        vm.expectRevert("Cooldown active");
        vm.prank(user1);
        staking.executeUnstake();
    }

    function test_ExecuteUnstake_WorksAfterCooldown() public {
        vm.deal(user1, STAKE_AMOUNT);
        uint256 balanceBefore = user1.balance;
        
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        staking.requestUnstake(STAKE_AMOUNT);

        // Fast forward 3 days
        vm.warp(block.timestamp + 3 days);

        vm.prank(user1);
        staking.executeUnstake();

        assertEq(user1.balance, balanceBefore); // Principal returned
        assertEq(staking.stakes(user1), 0);
        assertEq(staking.totalStaked(), 0);
        
        // Request should be cleared
        (uint256 amount, uint256 availableAt) = staking.getUnstakeRequest(user1);
        assertEq(amount, 0);
        assertEq(availableAt, 0);
    }

    function test_ExecuteUnstake_EmitsEvent() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        staking.requestUnstake(STAKE_AMOUNT);

        vm.warp(block.timestamp + 3 days);

        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit FishItStaking.UnstakeExecuted(user1, STAKE_AMOUNT);
        staking.executeUnstake();
    }

    function test_CancelUnstakeRequest_Works() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        staking.requestUnstake(STAKE_AMOUNT);

        vm.prank(user1);
        staking.cancelUnstakeRequest();

        (uint256 amount, uint256 availableAt) = staking.getUnstakeRequest(user1);
        assertEq(amount, 0);
        assertEq(availableAt, 0);
    }

    function test_CancelUnstakeRequest_RevertsIfNoRequest() public {
        vm.expectRevert("No unstake request");
        vm.prank(user1);
        staking.cancelUnstakeRequest();
    }

    function test_ExecuteUnstake_PartialUnstake() public {
        vm.deal(user1, 200 ether);
        vm.prank(user1);
        staking.stake{value: 200 ether}();

        uint256 unstakeAmount = 100 ether;
        vm.prank(user1);
        staking.requestUnstake(unstakeAmount);

        vm.warp(block.timestamp + 3 days);

        uint256 balanceBefore = user1.balance;
        vm.prank(user1);
        staking.executeUnstake();

        assertEq(user1.balance, balanceBefore + unstakeAmount);
        assertEq(staking.stakes(user1), 200 ether - unstakeAmount);
        assertEq(staking.totalStaked(), 200 ether - unstakeAmount);
    }
}
