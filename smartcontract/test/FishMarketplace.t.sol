// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {FishMarketplace} from "../src/FishMarketplace.sol";
import {FishItStaking} from "../src/FishItStaking.sol";
import {FishNFT} from "../src/FishNFT.sol";
import {FishingGame} from "../src/FishingGame.sol";
import {ZoneValidator} from "../src/ZoneValidator.sol";
import {FishBait} from "../src/FishBait.sol";

contract FishMarketplaceTest is Test {
    FishMarketplace public marketplace;
    FishItStaking public staking;
    FishNFT public fishNFT;
    FishingGame public fishingGame;
    ZoneValidator public zoneValidator;
    FishBait public fishBait;
    address public admin;
    address public seller;
    address public buyer;
    address public revenueRecipient;

    uint256 public constant LISTING_PRICE = 1 ether;
    uint256 public constant FEE_BPS = 250; // 2.5%

    function setUp() public {
        admin = address(0x1);
        seller = address(0x2);
        buyer = address(0x3);
        revenueRecipient = address(0x4);

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

        vm.prank(admin);
        marketplace = new FishMarketplace(admin, revenueRecipient);

        // Wire contracts
        vm.prank(admin);
        fishNFT.setFishingGame(address(fishingGame));

        vm.prank(admin);
        fishBait.setFishingGame(address(fishingGame));

        // Mint NFT for seller
        vm.prank(address(fishingGame));
        fishNFT.mintFish(seller, FishNFT.Tier.Common);
    }

    // =========================================================================
    // Constructor & Admin Tests
    // =========================================================================

    function test_Constructor_SetsValues() public {
        assertEq(marketplace.admin(), admin);
        assertEq(marketplace.revenueRecipient(), revenueRecipient);
    }

    function test_Constructor_RevertsIfZeroAddress() public {
        vm.expectRevert("Admin zero");
        new FishMarketplace(address(0), revenueRecipient);

        vm.expectRevert("Revenue zero");
        new FishMarketplace(admin, address(0));
    }

    function test_SetAdmin_OnlyAdmin() public {
        address newAdmin = address(0x5);
        vm.prank(admin);
        marketplace.setAdmin(newAdmin);
        assertEq(marketplace.admin(), newAdmin);
    }

    function test_SetRevenueRecipient_OnlyAdmin() public {
        address newRecipient = address(0x6);
        vm.prank(admin);
        marketplace.setRevenueRecipient(newRecipient);
        assertEq(marketplace.revenueRecipient(), newRecipient);
    }

    // =========================================================================
    // Listing Tests
    // =========================================================================

    function test_List_RequiresApproval() public {
        // First approve marketplace
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        (address listedSeller, uint256 listedPrice) = marketplace.listings(address(fishNFT), 1);
        assertEq(listedSeller, seller);
        assertEq(listedPrice, LISTING_PRICE);
    }

    function test_List_WithIsApprovedForAll() public {
        vm.prank(seller);
        fishNFT.setApprovalForAll(address(marketplace), true);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        (address listedSeller, uint256 listedPrice) = marketplace.listings(address(fishNFT), 1);
        assertEq(listedSeller, seller);
        assertEq(listedPrice, LISTING_PRICE);
    }

    function test_List_RevertsIfNotOwner() public {
        vm.expectRevert();
        vm.prank(buyer);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);
    }

    function test_List_RevertsIfNotApproved() public {
        vm.expectRevert("Marketplace not approved");
        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);
    }

    function test_List_RevertsIfPriceZero() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.expectRevert("Price zero");
        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, 0);
    }

    function test_List_EmitsEvent() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        vm.expectEmit(true, true, true, false);
        emit FishMarketplace.Listed(address(fishNFT), 1, seller, LISTING_PRICE);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);
    }

    // =========================================================================
    // Cancel Tests
    // =========================================================================

    function test_Cancel_RemovesListing() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        vm.prank(seller);
        marketplace.cancel(address(fishNFT), 1);

        (address listedSeller, ) = marketplace.listings(address(fishNFT), 1);
        assertEq(listedSeller, address(0));
    }

    function test_Cancel_RevertsIfNotListed() public {
        vm.expectRevert("Not listed");
        vm.prank(seller);
        marketplace.cancel(address(fishNFT), 1);
    }

    function test_Cancel_RevertsIfNotSeller() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        vm.expectRevert("Not seller");
        vm.prank(buyer);
        marketplace.cancel(address(fishNFT), 1);
    }

    function test_Cancel_EmitsEvent() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        vm.prank(seller);
        vm.expectEmit(true, true, true, false);
        emit FishMarketplace.Cancelled(address(fishNFT), 1, seller);
        marketplace.cancel(address(fishNFT), 1);
    }

    // =========================================================================
    // Buy Tests (all fees go to revenue in controlled economy)
    // =========================================================================

    function test_Buy_TransfersNFT() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        vm.deal(buyer, LISTING_PRICE);
        vm.prank(buyer);
        marketplace.buy{value: LISTING_PRICE}(address(fishNFT), 1);

        assertEq(fishNFT.ownerOf(1), buyer);
    }

    function test_Buy_PaysSeller() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        uint256 sellerBalanceBefore = seller.balance;
        uint256 fee = (LISTING_PRICE * FEE_BPS) / 10000;
        uint256 expectedSellerPayment = LISTING_PRICE - fee;

        vm.deal(buyer, LISTING_PRICE);
        vm.prank(buyer);
        marketplace.buy{value: LISTING_PRICE}(address(fishNFT), 1);

        assertEq(seller.balance, sellerBalanceBefore + expectedSellerPayment);
    }

    function test_Buy_AllFeesToRevenue() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        uint256 revenueBefore = revenueRecipient.balance;
        uint256 fee = (LISTING_PRICE * FEE_BPS) / 10000;

        vm.deal(buyer, LISTING_PRICE);
        vm.prank(buyer);
        marketplace.buy{value: LISTING_PRICE}(address(fishNFT), 1);

        // All fees go to revenue (no reward pool in controlled economy)
        assertEq(revenueRecipient.balance, revenueBefore + fee);
    }

    function test_Buy_RevertsIfNotListed() public {
        vm.deal(buyer, LISTING_PRICE);
        vm.expectRevert("Not listed");
        vm.prank(buyer);
        marketplace.buy{value: LISTING_PRICE}(address(fishNFT), 1);
    }

    function test_Buy_RevertsIfInsufficientPayment() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        vm.deal(buyer, LISTING_PRICE - 1);
        vm.expectRevert("Insufficient payment");
        vm.prank(buyer);
        marketplace.buy{value: LISTING_PRICE - 1}(address(fishNFT), 1);
    }

    function test_Buy_RefundsExcess() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        uint256 excessAmount = 0.1 ether;
        vm.deal(buyer, LISTING_PRICE + excessAmount);
        uint256 balanceBefore = buyer.balance;

        vm.prank(buyer);
        marketplace.buy{value: LISTING_PRICE + excessAmount}(address(fishNFT), 1);

        // Should refund excess
        assertEq(buyer.balance, balanceBefore - LISTING_PRICE);
    }

    function test_Buy_EmitsEvent() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        uint256 fee = (LISTING_PRICE * FEE_BPS) / 10000;
        vm.deal(buyer, LISTING_PRICE);
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit FishMarketplace.Purchased(address(fishNFT), 1, buyer, seller, LISTING_PRICE, fee);
        marketplace.buy{value: LISTING_PRICE}(address(fishNFT), 1);
    }

    function test_Buy_RemovesListing() public {
        vm.prank(seller);
        fishNFT.approve(address(marketplace), 1);

        vm.prank(seller);
        marketplace.list(address(fishNFT), 1, LISTING_PRICE);

        vm.deal(buyer, LISTING_PRICE);
        vm.prank(buyer);
        marketplace.buy{value: LISTING_PRICE}(address(fishNFT), 1);

        (address listedSeller, ) = marketplace.listings(address(fishNFT), 1);
        assertEq(listedSeller, address(0));
    }
}
