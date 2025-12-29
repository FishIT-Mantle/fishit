// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {FishNFT} from "../src/FishNFT.sol";
import {FishItStaking} from "../src/FishItStaking.sol";
import {FishingGame} from "../src/FishingGame.sol";

contract FishNFTTest is Test {
    FishNFT public fishNFT;
    FishItStaking public staking;
    address public fishingGame; // Changed to address (not contract instance)
    address public owner;
    address public user1;
    address public user2;

    string public constant TOKEN_URI = "ipfs://QmTest123";

    function setUp() public {
        owner = address(0x1);
        user1 = address(0x2);
        user2 = address(0x3);

        vm.prank(owner);
        fishNFT = new FishNFT(owner);

        // Setup staking for integration tests
        vm.prank(owner);
        staking = new FishItStaking(owner);

        // For NFT mint tests, we need to deploy a minimal FishingGame contract
        // or use a mock address that we can prank
        // Since mintFish checks msg.sender, we need to use vm.prank when calling it
        // So we can use any address and prank it
        fishingGame = address(0x99);
        vm.prank(owner);
        fishNFT.setFishingGame(fishingGame);
    }

    // =========================================================================
    // Constructor & Admin Tests
    // =========================================================================

    function test_Constructor_SetsOwner() public {
        assertEq(fishNFT.owner(), owner);
    }

    function test_Constructor_SetsNameAndSymbol() public {
        assertEq(fishNFT.name(), "FishIt Fish");
        assertEq(fishNFT.symbol(), "FISH");
    }

    function test_SetFishingGame_OnlyOwner() public {
        address newGame = address(0x5);
        vm.prank(owner);
        fishNFT.setFishingGame(newGame);
        assertEq(fishNFT.fishingGame(), newGame);
    }

    function test_SetFishingGame_RevertsIfNotOwner() public {
        vm.expectRevert();
        vm.prank(user1);
        fishNFT.setFishingGame(address(0x5));
    }

    // =========================================================================
    // Minting Tests
    // =========================================================================

    function test_MintFish_OnlyFishingGame() public {
        vm.prank(address(fishingGame));
        uint256 tokenId = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);

        assertEq(tokenId, 1);
        assertEq(fishNFT.ownerOf(tokenId), user1);
        assertEq(uint256(fishNFT.rarityOf(tokenId)), uint256(FishNFT.Rarity.Common));
    }

    function test_MintFish_RevertsIfNotFishingGame() public {
        vm.expectRevert(FishNFT.NotFishingGame.selector);
        vm.prank(user1);
        fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);
    }

    function test_MintFish_IncrementsTokenId() public {
        vm.prank(address(fishingGame));
        uint256 tokenId1 = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);

        vm.prank(address(fishingGame));
        uint256 tokenId2 = fishNFT.mintFishWithRarity(user2, FishNFT.Rarity.Rare);

        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(fishNFT.nextTokenId(), 2);
    }

    function test_MintFish_SetsRarity() public {
        vm.prank(address(fishingGame));
        uint256 tokenId = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Epic);

        assertEq(uint256(fishNFT.rarityOf(tokenId)), uint256(FishNFT.Rarity.Epic));
    }

    function test_MintFish_SetsTier() public {
        // boostBpsOf removed in new system (no yield)
        vm.prank(address(fishingGame));
        uint256 commonToken = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);
        assertEq(uint256(fishNFT.tierOf(commonToken)), uint256(FishNFT.Tier.Common));

        vm.prank(address(fishingGame));
        uint256 rareToken = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Rare);
        assertEq(uint256(fishNFT.tierOf(rareToken)), uint256(FishNFT.Tier.Rare));

        vm.prank(address(fishingGame));
        uint256 epicToken = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Epic);
        assertEq(uint256(fishNFT.tierOf(epicToken)), uint256(FishNFT.Tier.Epic));

        vm.prank(address(fishingGame));
        uint256 legendaryToken = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Legendary);
        assertEq(uint256(fishNFT.tierOf(legendaryToken)), uint256(FishNFT.Tier.Legendary));
    }

    function test_MintFish_AllRarities() public {
        FishNFT.Rarity[4] memory rarities = [
            FishNFT.Rarity.Common,
            FishNFT.Rarity.Rare,
            FishNFT.Rarity.Epic,
            FishNFT.Rarity.Legendary
        ];

        for (uint256 i = 0; i < rarities.length; i++) {
            vm.prank(address(fishingGame));
            uint256 tokenId = fishNFT.mintFishWithRarity(user1, rarities[i]);
            assertEq(uint256(fishNFT.rarityOf(tokenId)), uint256(rarities[i]));
        }
    }

    // =========================================================================
    // Token URI Tests
    // =========================================================================

    function test_SetTokenURI_OnlyOwner() public {
        vm.prank(address(fishingGame));
        uint256 tokenId = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);

        vm.prank(owner);
        fishNFT.setTokenURI(tokenId, TOKEN_URI);

        assertEq(fishNFT.tokenURI(tokenId), TOKEN_URI);
    }

    function test_SetTokenURI_RevertsIfNotOwner() public {
        vm.prank(address(fishingGame));
        uint256 tokenId = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);

        vm.expectRevert();
        vm.prank(user1);
        fishNFT.setTokenURI(tokenId, TOKEN_URI);
    }

    function test_SetTokenURI_RevertsIfTokenNotExists() public {
        vm.expectRevert();
        vm.prank(owner);
        fishNFT.setTokenURI(999, TOKEN_URI);
    }

    function test_SetTokenURI_CanOnlySetOnce() public {
        vm.prank(address(fishingGame));
        uint256 tokenId = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);

        vm.prank(owner);
        fishNFT.setTokenURI(tokenId, TOKEN_URI);

        vm.expectRevert(FishNFT.TokenURILocked.selector);
        vm.prank(owner);
        fishNFT.setTokenURI(tokenId, "ipfs://different");
    }

    function test_SetTokenURI_EmitsEvent() public {
        vm.prank(address(fishingGame));
        uint256 tokenId = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);

        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit FishNFT.TokenURIFinalized(tokenId, TOKEN_URI);
        fishNFT.setTokenURI(tokenId, TOKEN_URI);
    }

    function test_TokenURI_ReturnsEmptyIfNotSet() public {
        vm.prank(address(fishingGame));
        uint256 tokenId = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);

        // Should return empty string if not set
        string memory uri = fishNFT.tokenURI(tokenId);
        assertEq(bytes(uri).length, 0);
    }

    // =========================================================================
    // ERC721 Compliance Tests
    // =========================================================================

    function test_SupportsERC721Interface() public {
        // ERC721 interface ID: 0x80ac58cd
        assertTrue(fishNFT.supportsInterface(0x80ac58cd));
    }

    function test_BalanceOf_ReturnsCorrectBalance() public {
        assertEq(fishNFT.balanceOf(user1), 0);

        vm.prank(address(fishingGame));
        fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);

        assertEq(fishNFT.balanceOf(user1), 1);

        vm.prank(address(fishingGame));
        fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Rare);

        assertEq(fishNFT.balanceOf(user1), 2);
    }

    function test_Transfer_Works() public {
        vm.prank(address(fishingGame));
        uint256 tokenId = fishNFT.mintFishWithRarity(user1, FishNFT.Rarity.Common);

        vm.prank(user1);
        fishNFT.transferFrom(user1, user2, tokenId);

        assertEq(fishNFT.ownerOf(tokenId), user2);
        assertEq(fishNFT.balanceOf(user1), 0);
        assertEq(fishNFT.balanceOf(user2), 1);
    }
}

