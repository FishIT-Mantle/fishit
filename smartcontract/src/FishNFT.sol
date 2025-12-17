// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/access/Ownable.sol";

/**
 * @title FishNFT
 * @notice ERC-721 NFT representing Fish in FishIt ecosystem.
 *
 * - Minted only by FishingGame contract.
 * - Backend generates image via AI and uploads to IPFS.
 * - tokenURI is set once by owner (backend/multisig) after mint (option b).
 *
 * Rarity & boost (hardcoded from PRD):
 *  - Common:    boost 0%
 *  - Rare:      boost 1%
 *  - Epic:      boost 3%
 *  - Legendary: boost 5%
 *
 * Boost is expressed in basis points (1% = 100 bps).
 */
contract FishNFT is ERC721, Ownable {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum Rarity {
        Common,
        Rare,
        Epic,
        Legendary
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    uint256 public nextTokenId;

    // rarity per tokenId
    mapping(uint256 => Rarity) public rarityOf;

    // boost in basis points per tokenId (0, 100, 300, 500)
    mapping(uint256 => uint16) public boostBpsOf;

    // tokenURI per tokenId, set once by owner/backend
    mapping(uint256 => string) private _tokenURIs;

    // Address of FishingGame allowed to mint
    address public fishingGame;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event FishingGameUpdated(address indexed oldGame, address indexed newGame);
    event TokenURIFinalized(uint256 indexed tokenId, string uri);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotFishingGame();
    error TokenURILocked();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address owner_) ERC721("FishIt Fish", "FISH") Ownable(owner_) {}

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setFishingGame(address _game) external onlyOwner {
        emit FishingGameUpdated(fishingGame, _game);
        fishingGame = _game;
    }

    // -------------------------------------------------------------------------
    // Minting (only FishingGame)
    // -------------------------------------------------------------------------

    function mintFish(
        address to,
        Rarity rarity
    ) external returns (uint256 tokenId) {
        if (msg.sender != fishingGame) revert NotFishingGame();

        tokenId = ++nextTokenId;

        _safeMint(to, tokenId);

        rarityOf[tokenId] = rarity;
        boostBpsOf[tokenId] = _boostForRarity(rarity);
    }

    function _boostForRarity(Rarity rarity) internal pure returns (uint16) {
        if (rarity == Rarity.Common) return 0;
        if (rarity == Rarity.Rare) return 100; // 1%
        if (rarity == Rarity.Epic) return 300; // 3%
        if (rarity == Rarity.Legendary) return 500; // 5%
        return 0;
    }

    // -------------------------------------------------------------------------
    // Token URI management (backend / owner only, one-shot)
    // -------------------------------------------------------------------------

    /**
     * @notice Set tokenURI for a given token. Can only be set once.
     * @dev Intended to be called by owner (backend / multisig) after AI+IPFS is ready.
     */
    function setTokenURI(
        uint256 tokenId,
        string calldata uri
    ) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Nonexistent");
        if (bytes(_tokenURIs[tokenId]).length != 0) revert TokenURILocked();

        _tokenURIs[tokenId] = uri;
        emit TokenURIFinalized(tokenId, uri);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent");
        return _tokenURIs[tokenId];
    }
}
