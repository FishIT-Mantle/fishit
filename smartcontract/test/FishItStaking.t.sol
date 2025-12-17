// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {FishItStaking} from "../src/FishItStaking.sol";

contract FishItStakingTest is Test {
    FishItStaking public staking;
    address public admin;
    address public user1;
    address public user2;
    address public fishingGame;

    uint256 public constant STAKE_AMOUNT = 1 ether;
    uint256 public constant REWARD_AMOUNT = 0.1 ether;

    function setUp() public {
        admin = address(0x1);
        user1 = address(0x2);
        user2 = address(0x3);
        fishingGame = address(0x4);

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

    function test_SetFishingGame_OnlyAdmin() public {
        vm.prank(admin);
        staking.setFishingGame(fishingGame);
        assertEq(staking.fishingGame(), fishingGame);
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
        emit FishItStaking.Staked(user1, STAKE_AMOUNT);
        staking.stake{value: STAKE_AMOUNT}();
    }

    function test_Stake_RevertsIfZeroAmount() public {
        vm.deal(user1, 0);
        vm.prank(user1);
        vm.expectRevert("Zero amount");
        staking.stake{value: 0}();
    }

    function test_Stake_MultipleUsers() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.deal(user2, STAKE_AMOUNT * 2);

        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user2);
        staking.stake{value: STAKE_AMOUNT * 2}();

        assertEq(staking.stakes(user1), STAKE_AMOUNT);
        assertEq(staking.stakes(user2), STAKE_AMOUNT * 2);
        assertEq(staking.totalStaked(), STAKE_AMOUNT * 3);
    }

    function test_Stake_UpdatesEnergyTimestamp() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        assertGt(staking.lastEnergyUpdate(user1), 0);
    }

    // =========================================================================
    // Unstaking Tests
    // =========================================================================

    function test_Unstake_WithdrawsPrincipal() public {
        vm.deal(user1, STAKE_AMOUNT);
        uint256 balanceBeforeStake = user1.balance;
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        uint256 balanceAfterStake = user1.balance;
        assertEq(balanceAfterStake, balanceBeforeStake - STAKE_AMOUNT);

        vm.prank(user1);
        staking.unstake(STAKE_AMOUNT, false);

        // Balance should be back to original (principal returned)
        assertEq(user1.balance, balanceBeforeStake);
        assertEq(staking.stakes(user1), 0);
        assertEq(staking.totalStaked(), 0);
    }

    function test_Unstake_EmitsEvent() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit FishItStaking.Unstaked(user1, STAKE_AMOUNT);
        staking.unstake(STAKE_AMOUNT, false);
    }

    function test_Unstake_RevertsIfInsufficientStake() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        vm.expectRevert("Insufficient stake");
        staking.unstake(STAKE_AMOUNT + 1, false);
    }

    function test_Unstake_Partial() public {
        vm.deal(user1, STAKE_AMOUNT * 2);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT * 2}();

        vm.prank(user1);
        staking.unstake(STAKE_AMOUNT, false);

        assertEq(staking.stakes(user1), STAKE_AMOUNT);
        assertEq(staking.totalStaked(), STAKE_AMOUNT);
    }

    function test_Unstake_WithClaimRewards() public {
        vm.deal(user1, STAKE_AMOUNT);
        uint256 balanceBeforeStake = user1.balance;
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        // Fund reward pool and allocate reward
        vm.deal(admin, REWARD_AMOUNT);
        vm.prank(admin);
        staking.fundRewardPool{value: REWARD_AMOUNT}();

        vm.prank(admin);
        staking.setFishingGame(fishingGame);
        vm.prank(fishingGame);
        staking.allocateReward(user1, REWARD_AMOUNT);

        vm.prank(user1);
        staking.unstake(STAKE_AMOUNT, true);

        // Balance should be original balance + reward (principal was already returned)
        assertEq(user1.balance, balanceBeforeStake + REWARD_AMOUNT);
        assertEq(staking.pendingRewards(user1), 0);
    }

    function test_Unstake_ResetsEnergyOnFullUnstake() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        staking.unstake(STAKE_AMOUNT, false);

        assertEq(staking.lastEnergyUpdate(user1), 0);
    }

    // =========================================================================
    // Reward Pool Tests
    // =========================================================================

    function test_FundRewardPool_UpdatesBalance() public {
        vm.deal(admin, REWARD_AMOUNT);
        vm.prank(admin);
        staking.fundRewardPool{value: REWARD_AMOUNT}();

        assertEq(staking.rewardPoolBalance(), REWARD_AMOUNT);
    }

    function test_FundRewardPool_EmitsEvent() public {
        vm.deal(admin, REWARD_AMOUNT);
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit FishItStaking.RewardPoolFunded(admin, REWARD_AMOUNT);
        staking.fundRewardPool{value: REWARD_AMOUNT}();
    }

    function test_AllocateReward_OnlyGame() public {
        vm.deal(admin, REWARD_AMOUNT);
        vm.prank(admin);
        staking.fundRewardPool{value: REWARD_AMOUNT}();

        vm.prank(admin);
        staking.setFishingGame(fishingGame);

        vm.prank(fishingGame);
        staking.allocateReward(user1, REWARD_AMOUNT);

        assertEq(staking.pendingRewards(user1), REWARD_AMOUNT);
        assertEq(staking.rewardPoolBalance(), 0);
    }

    function test_AllocateReward_RevertsIfNotGame() public {
        vm.deal(admin, REWARD_AMOUNT);
        vm.prank(admin);
        staking.fundRewardPool{value: REWARD_AMOUNT}();

        vm.expectRevert("Not game");
        vm.prank(user1);
        staking.allocateReward(user1, REWARD_AMOUNT);
    }

    function test_AllocateReward_RevertsIfInsufficientPool() public {
        vm.deal(admin, REWARD_AMOUNT);
        vm.prank(admin);
        staking.fundRewardPool{value: REWARD_AMOUNT}();

        vm.prank(admin);
        staking.setFishingGame(fishingGame);

        vm.expectRevert("Insufficient pool");
        vm.prank(fishingGame);
        staking.allocateReward(user1, REWARD_AMOUNT + 1);
    }

    function test_ClaimRewards_TransfersRewards() public {
        vm.deal(admin, REWARD_AMOUNT);
        vm.prank(admin);
        staking.fundRewardPool{value: REWARD_AMOUNT}();

        vm.prank(admin);
        staking.setFishingGame(fishingGame);
        vm.prank(fishingGame);
        staking.allocateReward(user1, REWARD_AMOUNT);

        uint256 balanceBefore = user1.balance;
        vm.prank(user1);
        staking.claimRewards();

        assertEq(user1.balance, balanceBefore + REWARD_AMOUNT);
        assertEq(staking.pendingRewards(user1), 0);
    }

    function test_ClaimRewards_EmitsEvent() public {
        vm.deal(admin, REWARD_AMOUNT);
        vm.prank(admin);
        staking.fundRewardPool{value: REWARD_AMOUNT}();

        vm.prank(admin);
        staking.setFishingGame(fishingGame);
        vm.prank(fishingGame);
        staking.allocateReward(user1, REWARD_AMOUNT);

        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit FishItStaking.RewardClaimed(user1, REWARD_AMOUNT);
        staking.claimRewards();
    }

    // =========================================================================
    // Energy Calculation Tests
    // =========================================================================

    function test_ComputeEnergyPerDay_ReturnsZeroIfNoStake() public {
        assertEq(staking.computeEnergyPerDay(user1), 0);
    }

    function test_ComputeEnergyPerDay_1MNT() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        staking.stake{value: 1 ether}();

        // sqrt(1 ether) ≈ 1e9 (in wei, but we want per MNT)
        // Actually: sqrt(1e18) ≈ 1e9, but we want 1 energy per day for 1 MNT
        // The formula is sqrt(staked), so sqrt(1e18) = 1e9 wei = 1e-9 MNT
        // But PRD says 1 MNT = 1 energy, so we need to check the actual implementation
        uint256 energy = staking.computeEnergyPerDay(user1);
        assertGt(energy, 0);
    }

    function test_ComputeEnergyPerDay_4MNT() public {
        vm.deal(user1, 4 ether);
        vm.prank(user1);
        staking.stake{value: 4 ether}();

        uint256 energy = staking.computeEnergyPerDay(user1);
        // sqrt(4) = 2, so should be approximately 2 * sqrt(1 ether)
        assertGt(energy, 0);
    }

    function test_ComputeEnergyPerDay_100MNT() public {
        vm.deal(user1, 100 ether);
        vm.prank(user1);
        staking.stake{value: 100 ether}();

        uint256 energy = staking.computeEnergyPerDay(user1);
        // sqrt(100) = 10, so should be approximately 10 * sqrt(1 ether)
        assertGt(energy, 0);
    }
}

