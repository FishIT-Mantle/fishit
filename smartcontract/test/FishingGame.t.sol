// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {FishingGame} from "../src/FishingGame.sol";
import {FishItStaking} from "../src/FishItStaking.sol";
import {FishNFT} from "../src/FishNFT.sol";
import {ZoneValidator} from "../src/ZoneValidator.sol";
import {FishBait} from "../src/FishBait.sol";
import {MockSupraRouter} from "./mocks/MockSupraRouter.sol";
import {ISupraRouter} from "../src/interfaces/ISupraRouter.sol";

contract FishingGameTest is Test {
    FishingGame public fishingGame;
    FishItStaking public staking;
    FishNFT public fishNFT;
    ZoneValidator public zoneValidator;
    FishBait public fishBait;
    MockSupraRouter public mockSupraRouter;
    address public admin;
    address public user1;
    address public revenueRecipient;

    uint256 public constant STAKE_AMOUNT = 100 ether; // Enough for Zone 2 access

    function setUp() public {
        admin = address(0x1);
        user1 = address(0x2);
        revenueRecipient = address(0x3);

        vm.prank(admin);
        staking = new FishItStaking(admin);

        vm.prank(admin);
        fishNFT = new FishNFT(admin);

        vm.prank(admin);
        zoneValidator = new ZoneValidator(admin, staking, fishNFT);

        vm.prank(admin);
        fishBait = new FishBait(admin);

        vm.prank(admin);
        fishingGame = new FishingGame(
            admin,
            staking,
            fishNFT,
            zoneValidator,
            fishBait,
            revenueRecipient
        );

        // Deploy mock Supra Router
        mockSupraRouter = new MockSupraRouter();

        // Wire contracts
        vm.prank(admin);
        zoneValidator.setFishingGame(address(fishingGame));

        vm.prank(admin);
        fishNFT.setFishingGame(address(fishingGame));

        vm.prank(admin);
        fishBait.setFishingGame(address(fishingGame));

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
        assertEq(address(fishingGame.zoneValidator()), address(zoneValidator));
        assertEq(address(fishingGame.fishBait()), address(fishBait));
        assertEq(fishingGame.revenueRecipient(), revenueRecipient);
    }

    function test_Constructor_RevertsIfZeroAddress() public {
        vm.expectRevert("Admin zero");
        new FishingGame(address(0), staking, fishNFT, zoneValidator, fishBait, revenueRecipient);

        vm.expectRevert("Staking zero");
        new FishingGame(admin, FishItStaking(address(0)), fishNFT, zoneValidator, fishBait, revenueRecipient);

        vm.expectRevert("NFT zero");
        new FishingGame(admin, staking, FishNFT(address(0)), zoneValidator, fishBait, revenueRecipient);

        vm.expectRevert("Validator zero");
        new FishingGame(admin, staking, fishNFT, ZoneValidator(address(0)), fishBait, revenueRecipient);

        vm.expectRevert("Bait zero");
        new FishingGame(admin, staking, fishNFT, zoneValidator, FishBait(address(0)), revenueRecipient);

        vm.expectRevert("Revenue zero");
        new FishingGame(admin, staking, fishNFT, zoneValidator, fishBait, address(0));
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

    // =========================================================================
    // Zone 1 (Shallow) - No requirements tests
    // =========================================================================

    function test_CastLine_Zone1_Works() public {
        vm.deal(user1, 10 ether);

        // Purchase bait
        vm.prank(user1);
        fishBait.purchaseBait{value: 1 ether}(FishBait.BaitType.Common, 1);

        // Approve FishingGame to burn (not needed for Zone 1, but good to have)
        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishingGame), true);

        // Cast line in Zone 1 (no requirements)
        vm.prank(user1);
        uint256 requestId = fishingGame.castLine{value: 0}(
            ZoneValidator.Zone.Shallow,
            FishingGame.BaitType.Common
        );

        assertGt(requestId, 0);
    }

    function test_CastLine_Zone1_RevertsIfNoBait() public {
        vm.deal(user1, 10 ether);

        // Don't purchase bait - should revert
        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishingGame), true);

        vm.expectRevert("Insufficient bait");
        vm.prank(user1);
        fishingGame.castLine{value: 0}(
            ZoneValidator.Zone.Shallow,
            FishingGame.BaitType.Common
        );
    }

    // =========================================================================
    // Zone 2 (Reef) - Requires stake >= 100 MNT and burn 3 Common
    // =========================================================================

    function test_CastLine_Zone2_RevertsIfInsufficientStake() public {
        vm.deal(user1, 200 ether);
        
        // Stake less than 100 MNT
        vm.prank(user1);
        staking.stake{value: 50 ether}();

        // Purchase bait
        vm.prank(user1);
        fishBait.purchaseBait{value: 1 ether}(FishBait.BaitType.Common, 1);

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishingGame), true);

        vm.expectRevert("Insufficient stake for license");
        vm.prank(user1);
        fishingGame.castLine{value: 0}(
            ZoneValidator.Zone.Reef,
            FishingGame.BaitType.Common
        );
    }

    function test_CastLine_Zone2_RevertsIfNoBurnRequirement() public {
        vm.deal(user1, 200 ether);
        
        // Stake enough for Zone 2
        vm.prank(user1);
        staking.stake{value: 100 ether}();

        // Purchase bait
        vm.prank(user1);
        fishBait.purchaseBait{value: 1 ether}(FishBait.BaitType.Common, 1);

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishingGame), true);

        // Don't have 3 Common to burn - should revert
        vm.expectRevert("Insufficient fish to burn");
        vm.prank(user1);
        fishingGame.castLine{value: 0}(
            ZoneValidator.Zone.Reef,
            FishingGame.BaitType.Common
        );
    }

    // =========================================================================
    // Zone 4 (Abyssal) - Requires Epic Bait only
    // =========================================================================

    function test_CastLine_Zone4_RevertsIfNotEpicBait() public {
        vm.deal(user1, 600 ether);
        
        // Stake enough for Zone 4
        vm.prank(user1);
        staking.stake{value: 500 ether}();

        // Purchase Common bait (not Epic)
        vm.prank(user1);
        fishBait.purchaseBait{value: 1 ether}(FishBait.BaitType.Common, 1);

        // Would need to have Epic fish to burn and entry fee, but first check Epic bait requirement
        vm.expectRevert("Zone 4 requires Epic Bait only");
        vm.prank(user1);
        fishingGame.castLine{value: 3 ether}(
            ZoneValidator.Zone.Abyssal,
            FishingGame.BaitType.Common
        );
    }

    // =========================================================================
    // VRF Callback Tests
    // =========================================================================

    function test_SupraVRFCallback_MintsNFT() public {
        vm.deal(user1, 10 ether);
        
        // Purchase bait
        vm.prank(user1);
        fishBait.purchaseBait{value: 1 ether}(FishBait.BaitType.Common, 1);

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishingGame), true);

        // Cast line in Zone 1
        vm.prank(user1);
        uint256 requestId = fishingGame.castLine{value: 0}(
            ZoneValidator.Zone.Shallow,
            FishingGame.BaitType.Common
        );

        // Fulfill VRF request
        uint256[] memory rngList = new uint256[](1);
        rngList[0] = 5000; // Should result in Common tier based on drop table
        mockSupraRouter.fulfillRequest(requestId, rngList, 0);

        // Check NFT was minted
        assertEq(fishNFT.balanceOf(user1), 1);
        assertEq(fishNFT.ownerOf(1), user1);
    }

    function test_SupraVRFCallback_Zone1DropTable() public {
        vm.deal(user1, 100 ether);
        
        // Purchase multiple baits
        vm.prank(user1);
        fishBait.purchaseBait{value: 10 ether}(FishBait.BaitType.Common, 10);

        vm.prank(user1);
        fishNFT.setApprovalForAll(address(fishingGame), true);

        // Test Common Bait drop table for Zone 1:
        // Junk: 40% | Common: 45% | Rare: 14% | Epic: 1% | Legendary: 0%

        // Roll 3000 = Junk (0-3999)
        vm.prank(user1);
        uint256 req1 = fishingGame.castLine{value: 0}(ZoneValidator.Zone.Shallow, FishingGame.BaitType.Common);
        uint256[] memory rng1 = new uint256[](1);
        rng1[0] = 3000;
        mockSupraRouter.fulfillRequest(req1, rng1, 0);
        assertEq(uint256(fishNFT.tierOf(1)), uint256(FishNFT.Tier.Junk));

        // Roll 6000 = Common (4000-8499)
        vm.prank(user1);
        uint256 req2 = fishingGame.castLine{value: 0}(ZoneValidator.Zone.Shallow, FishingGame.BaitType.Common);
        uint256[] memory rng2 = new uint256[](1);
        rng2[0] = 6000;
        mockSupraRouter.fulfillRequest(req2, rng2, 0);
        assertEq(uint256(fishNFT.tierOf(2)), uint256(FishNFT.Tier.Common));

        // Roll 9000 = Rare (8500-9899)
        vm.prank(user1);
        uint256 req3 = fishingGame.castLine{value: 0}(ZoneValidator.Zone.Shallow, FishingGame.BaitType.Common);
        uint256[] memory rng3 = new uint256[](1);
        rng3[0] = 9000;
        mockSupraRouter.fulfillRequest(req3, rng3, 0);
        assertEq(uint256(fishNFT.tierOf(3)), uint256(FishNFT.Tier.Rare));

        // Roll 9900 = Epic (9900-9999)
        vm.prank(user1);
        uint256 req4 = fishingGame.castLine{value: 0}(ZoneValidator.Zone.Shallow, FishingGame.BaitType.Common);
        uint256[] memory rng4 = new uint256[](1);
        rng4[0] = 9900;
        mockSupraRouter.fulfillRequest(req4, rng4, 0);
        assertEq(uint256(fishNFT.tierOf(4)), uint256(FishNFT.Tier.Epic));
    }
}
