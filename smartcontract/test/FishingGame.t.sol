// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {FishingGame} from "../src/FishingGame.sol";
import {FishItStaking} from "../src/FishItStaking.sol";
import {FishNFT} from "../src/FishNFT.sol";
import {MockSupraRouter} from "./mocks/MockSupraRouter.sol";
import {ISupraRouter} from "../src/interfaces/ISupraRouter.sol";

contract FishingGameTest is Test {
    FishingGame public fishingGame;
    FishItStaking public staking;
    FishNFT public fishNFT;
    MockSupraRouter public mockSupraRouter;
    address public admin;
    address public user1;
    address public revenueRecipient;

    uint256 public constant STAKE_AMOUNT = 1 ether;
    uint256 public constant COMMON_BAIT_PRICE = 0.05 ether;
    uint256 public constant RARE_BAIT_PRICE = 0.15 ether;
    uint256 public constant EPIC_BAIT_PRICE = 0.50 ether;

    function setUp() public {
        admin = address(0x1);
        user1 = address(0x2);
        revenueRecipient = address(0x3);

        vm.prank(admin);
        staking = new FishItStaking(admin);

        vm.prank(admin);
        fishNFT = new FishNFT(admin);

        vm.prank(admin);
        fishingGame = new FishingGame(admin, staking, fishNFT, revenueRecipient);

        // Deploy mock Supra Router
        mockSupraRouter = new MockSupraRouter();

        // Wire contracts
        vm.prank(admin);
        staking.setFishingGame(address(fishingGame));

        vm.prank(admin);
        fishNFT.setFishingGame(address(fishingGame));

        // Set bait prices
        vm.prank(admin);
        fishingGame.setBaitPrices(COMMON_BAIT_PRICE, RARE_BAIT_PRICE, EPIC_BAIT_PRICE);

        // Set Supra VRF config
        vm.prank(admin);
        fishingGame.setSupraVRFConfig(address(mockSupraRouter), 3);
    }

    // =========================================================================
    // Constructor & Admin Tests
    // =========================================================================

    function test_Constructor_SetsValues() public {
        assertEq(fishingGame.admin(), admin);
        assertEq(address(fishingGame.staking()), address(staking));
        assertEq(address(fishingGame.fishNFT()), address(fishNFT));
        assertEq(fishingGame.revenueRecipient(), revenueRecipient);
    }

    function test_Constructor_RevertsIfZeroAddress() public {
        vm.expectRevert("Admin zero");
        new FishingGame(address(0), staking, fishNFT, revenueRecipient);

        vm.expectRevert("Staking zero");
        new FishingGame(admin, FishItStaking(address(0)), fishNFT, revenueRecipient);

        vm.expectRevert("NFT zero");
        new FishingGame(admin, staking, FishNFT(address(0)), revenueRecipient);

        vm.expectRevert("Revenue zero");
        new FishingGame(admin, staking, fishNFT, address(0));
    }

    function test_SetBaitPrices_OnlyAdmin() public {
        vm.prank(admin);
        fishingGame.setBaitPrices(1 ether, 2 ether, 3 ether);

        assertEq(fishingGame.commonBaitPrice(), 1 ether);
        assertEq(fishingGame.rareBaitPrice(), 2 ether);
        assertEq(fishingGame.epicBaitPrice(), 3 ether);
    }

    function test_SetSupraVRFConfig_OnlyAdmin() public {
        MockSupraRouter newRouter = new MockSupraRouter();
        uint256 newConfirmations = 5;

        vm.prank(admin);
        fishingGame.setSupraVRFConfig(address(newRouter), newConfirmations);

        assertEq(address(fishingGame.supraRouter()), address(newRouter));
        assertEq(fishingGame.supraNumConfirmations(), newConfirmations);
    }

    function test_SetSupraVRFConfig_RevertsIfNotAdmin() public {
        MockSupraRouter newRouter = new MockSupraRouter();
        vm.expectRevert("Not admin");
        vm.prank(user1);
        fishingGame.setSupraVRFConfig(address(newRouter), 3);
    }

    function test_SetSupraVRFConfig_RevertsIfRouterZero() public {
        vm.expectRevert("Router zero");
        vm.prank(admin);
        fishingGame.setSupraVRFConfig(address(0), 3);
    }

    function test_SetSupraVRFConfig_RevertsIfConfirmationsZero() public {
        MockSupraRouter newRouter = new MockSupraRouter();
        vm.expectRevert("Invalid confirmations");
        vm.prank(admin);
        fishingGame.setSupraVRFConfig(address(newRouter), 0);
    }

    // =========================================================================
    // Energy Tests
    // =========================================================================

    function test_AvailableEnergy_ReturnsZeroIfNoStake() public {
        assertEq(fishingGame.availableEnergy(user1), 0);
    }

    function test_AvailableEnergy_ReturnsCorrectAfterStake() public {
        vm.deal(user1, STAKE_AMOUNT);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        uint256 energy = fishingGame.availableEnergy(user1);
        assertGt(energy, 0);
    }

    function test_AvailableEnergy_DecreasesAfterCast() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        uint256 energyBefore = fishingGame.availableEnergy(user1);

        // Cast line (will fail at VRF, but energy should be consumed)
        vm.prank(user1);
        fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);

        uint256 energyAfter = fishingGame.availableEnergy(user1);
        assertEq(energyAfter, energyBefore - 1);
    }

    function test_AvailableEnergy_RegeneratesAfter24Hours() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        // Cast line
        vm.prank(user1);
        fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);

        // Fast forward 24 hours
        vm.warp(block.timestamp + 1 days);

        uint256 energyAfter = fishingGame.availableEnergy(user1);
        assertGt(energyAfter, 0);
    }

    // =========================================================================
    // Cast Line Tests
    // =========================================================================

    function test_CastLine_ConsumesEnergy() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        uint256 energyBefore = fishingGame.availableEnergy(user1);
        vm.prank(user1);
        fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);

        uint256 energyAfter = fishingGame.availableEnergy(user1);
        assertEq(energyAfter, energyBefore - 1);
    }

    function test_CastLine_RevertsIfNoEnergy() public {
        vm.deal(user1, COMMON_BAIT_PRICE);
        vm.expectRevert("Not enough energy");
        vm.prank(user1);
        fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);
    }

    function test_CastLine_RevertsIfInsufficientBaitFee() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE - 1);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.expectRevert("Insufficient bait fee");
        vm.prank(user1);
        fishingGame.castLine{value: COMMON_BAIT_PRICE - 1}(FishingGame.BaitType.Common);
    }

    function test_CastLine_SplitsBaitFee() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        uint256 rewardPoolBefore = staking.rewardPoolBalance();
        uint256 revenueBefore = revenueRecipient.balance;

        vm.prank(user1);
        fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);

        // 80% to reward pool, 20% to revenue
        uint256 expectedReward = (COMMON_BAIT_PRICE * 8000) / 10000;
        uint256 expectedRevenue = COMMON_BAIT_PRICE - expectedReward;

        assertEq(staking.rewardPoolBalance(), rewardPoolBefore + expectedReward);
        assertEq(revenueRecipient.balance, revenueBefore + expectedRevenue);
    }

    function test_CastLine_RefundsExcess() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE + 0.1 ether);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        uint256 balanceBefore = user1.balance;
        vm.prank(user1);
        fishingGame.castLine{value: COMMON_BAIT_PRICE + 0.1 ether}(FishingGame.BaitType.Common);

        // Should refund 0.1 ether
        assertEq(user1.balance, balanceBefore - COMMON_BAIT_PRICE);
    }

    function test_CastLine_EmitsEvent() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        vm.expectEmit(true, true, false, false);
        emit FishingGame.CastLineRequested(user1, FishingGame.BaitType.Common, 1);
        fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);
    }

    function test_CastLine_AllBaitTypes() public {
        uint256 totalBaitCost = COMMON_BAIT_PRICE + RARE_BAIT_PRICE + EPIC_BAIT_PRICE;
        vm.deal(user1, STAKE_AMOUNT * 10 + totalBaitCost); // Enough for stake + all bait fees
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT * 10}();

        // Common
        vm.prank(user1);
        fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);

        // Rare
        vm.prank(user1);
        fishingGame.castLine{value: RARE_BAIT_PRICE}(FishingGame.BaitType.Rare);

        // Epic
        vm.prank(user1);
        fishingGame.castLine{value: EPIC_BAIT_PRICE}(FishingGame.BaitType.Epic);
    }

    // =========================================================================
    // Supra VRF Fulfillment Tests
    // =========================================================================

    function test_SupraVRFCallback_OnlySupraRouter() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        uint256 requestId = fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);

        uint256[] memory rngList = new uint256[](1);
        rngList[0] = 5000;

        vm.expectRevert("Not Supra Router");
        vm.prank(user1);
        fishingGame.supraVRFCallback(requestId, rngList, 0);
    }

    function test_SupraVRFCallback_MintsNFT() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        uint256 requestId = fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);

        uint256 nftBalanceBefore = fishNFT.balanceOf(user1);

        // Fulfill with random word (5000 = Common for Common bait)
        uint256[] memory rngList = new uint256[](1);
        rngList[0] = 5000;
        mockSupraRouter.fulfillRequest(requestId, rngList, 0);

        assertEq(fishNFT.balanceOf(user1), nftBalanceBefore + 1);
    }

    function test_SupraVRFCallback_EmitsFishCaught() public {
        vm.deal(user1, STAKE_AMOUNT + COMMON_BAIT_PRICE);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT}();

        vm.prank(user1);
        uint256 requestId = fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);

        uint256[] memory rngList = new uint256[](1);
        rngList[0] = 5000;

        vm.expectEmit(true, true, false, true);
        emit FishingGame.FishCaught(user1, 1, FishNFT.Rarity.Common, FishingGame.BaitType.Common, 5000);
        mockSupraRouter.fulfillRequest(requestId, rngList, 0);
    }

    function test_SupraVRFCallback_RarityDistribution_CommonBait() public {
        uint256 totalBaitCost = COMMON_BAIT_PRICE * 4; // 4 casts
        vm.deal(user1, STAKE_AMOUNT * 100 + totalBaitCost);
        vm.prank(user1);
        staking.stake{value: STAKE_AMOUNT * 100}();

        // Test different roll values for Common bait
        // Common: < 7000, Rare: 7000-9499, Epic: 9500-9949, Legendary: >= 9950

        // Common (roll = 5000)
        vm.prank(user1);
        uint256 req1 = fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);
        uint256[] memory rng1 = new uint256[](1);
        rng1[0] = 5000;
        mockSupraRouter.fulfillRequest(req1, rng1, 0);
        assertEq(uint256(fishNFT.rarityOf(1)), uint256(FishNFT.Rarity.Common));

        // Rare (roll = 8000)
        vm.prank(user1);
        uint256 req2 = fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);
        uint256[] memory rng2 = new uint256[](1);
        rng2[0] = 8000;
        mockSupraRouter.fulfillRequest(req2, rng2, 0);
        assertEq(uint256(fishNFT.rarityOf(2)), uint256(FishNFT.Rarity.Rare));

        // Epic (roll = 9700)
        vm.prank(user1);
        uint256 req3 = fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);
        uint256[] memory rng3 = new uint256[](1);
        rng3[0] = 9700;
        mockSupraRouter.fulfillRequest(req3, rng3, 0);
        assertEq(uint256(fishNFT.rarityOf(3)), uint256(FishNFT.Rarity.Epic));

        // Legendary (roll = 9999)
        vm.prank(user1);
        uint256 req4 = fishingGame.castLine{value: COMMON_BAIT_PRICE}(FishingGame.BaitType.Common);
        uint256[] memory rng4 = new uint256[](1);
        rng4[0] = 9999;
        mockSupraRouter.fulfillRequest(req4, rng4, 0);
        assertEq(uint256(fishNFT.rarityOf(4)), uint256(FishNFT.Rarity.Legendary));
    }
}

