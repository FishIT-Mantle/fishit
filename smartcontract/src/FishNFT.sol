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

    enum Tier {
        Junk,
        Common,
        Rare,
        Epic,
        Legendary
    }

    // Backward compatibility - alias for Tier
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

    // tier per tokenId (Junk, Common, Rare, Epic, Legendary)
    mapping(uint256 => Tier) public tierOf;

    // Backward compatibility - rarity per tokenId (no Junk in old enum)
    mapping(uint256 => Rarity) public rarityOf;

    // Track if token is burned
    mapping(uint256 => bool) public isBurned;

    // Upgrade system contract (optional, for upgrade functions)
    address public upgradeSystem;

    // tokenURI per tokenId, set once by owner/backend
    mapping(uint256 => string) private _tokenURIs;

    // Address of FishingGame allowed to mint
    address public fishingGame;

    // Address of Upgrade contract allowed to mint (for upgrades)
    address public upgradeContract;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event FishingGameUpdated(address indexed oldGame, address indexed newGame);
    event TokenURIFinalized(uint256 indexed tokenId, string uri);
    event FishBurned(address indexed user, uint256[] tokenIds, Tier tier, string purpose);
    event UpgradeSystemUpdated(address indexed oldSystem, address indexed newSystem);
    event UpgradeContractUpdated(address indexed oldContract, address indexed newContract);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotFishingGame();
    error NotUpgradeContract();
    error TokenURILocked();
    error NotOwner();
    error AlreadyBurned();
    error InvalidTier();
    error InsufficientBalance();

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

    function setUpgradeSystem(address _upgradeSystem) external onlyOwner {
        emit UpgradeSystemUpdated(upgradeSystem, _upgradeSystem);
        upgradeSystem = _upgradeSystem;
    }

    function setUpgradeContract(address _upgradeContract) external onlyOwner {
        emit UpgradeContractUpdated(upgradeContract, _upgradeContract);
        upgradeContract = _upgradeContract;
    }

    // -------------------------------------------------------------------------
    // Minting (only FishingGame)
    // -------------------------------------------------------------------------

    /**
     * @notice Mint fish with Tier (new system)
     * @dev Can be called by FishingGame or UpgradeContract
     */
    function mintFish(
        address to,
        Tier tier
    ) external returns (uint256 tokenId) {
        if (msg.sender != fishingGame && msg.sender != upgradeContract) {
            revert NotFishingGame();
        }

        tokenId = ++nextTokenId;
        _safeMint(to, tokenId);

        tierOf[tokenId] = tier;
        isBurned[tokenId] = false;

        // Backward compatibility: map Tier to Rarity (skip Junk)
        if (tier == Tier.Common) rarityOf[tokenId] = Rarity.Common;
        else if (tier == Tier.Rare) rarityOf[tokenId] = Rarity.Rare;
        else if (tier == Tier.Epic) rarityOf[tokenId] = Rarity.Epic;
        else if (tier == Tier.Legendary) rarityOf[tokenId] = Rarity.Legendary;
        // Junk has no Rarity equivalent
    }

    /**
     * @notice Mint fish with Rarity (backward compatibility)
     * @dev This function is kept for backward compatibility with old FishingGame contract
     */
    function mintFishWithRarity(
        address to,
        Rarity rarity
    ) external returns (uint256 tokenId) {
        if (msg.sender != fishingGame) revert NotFishingGame();

        Tier tier;
        if (rarity == Rarity.Common) tier = Tier.Common;
        else if (rarity == Rarity.Rare) tier = Tier.Rare;
        else if (rarity == Rarity.Epic) tier = Tier.Epic;
        else if (rarity == Rarity.Legendary) tier = Tier.Legendary;
        else revert InvalidTier();

        tokenId = ++nextTokenId;
        _safeMint(to, tokenId);

        tierOf[tokenId] = tier;
        isBurned[tokenId] = false;
        rarityOf[tokenId] = rarity;
    }

    // -------------------------------------------------------------------------
    // Burn functions
    // -------------------------------------------------------------------------

    /**
     * @notice Burn a single fish token
     */
    function burn(uint256 tokenId, string calldata purpose) external {
        require(_ownerOf(tokenId) == msg.sender, "Not owner");
        require(!isBurned[tokenId], "Already burned");

        isBurned[tokenId] = true;
        _burn(tokenId);

        Tier tier = tierOf[tokenId];
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;

        emit FishBurned(msg.sender, tokenIds, tier, purpose);
    }

    /**
     * @notice Burn multiple fish tokens
     */
    function burnBatch(
        uint256[] calldata tokenIds,
        string calldata purpose
    ) external {
        require(tokenIds.length > 0, "Empty array");
        
        Tier tier = tierOf[tokenIds[0]]; // Use first token's tier (should all be same)

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(_ownerOf(tokenId) == msg.sender, "Not owner");
            require(!isBurned[tokenId], "Already burned");
            require(tierOf[tokenId] == tier, "Mixed tiers");

            isBurned[tokenId] = true;
            _burn(tokenId);
        }

        emit FishBurned(msg.sender, tokenIds, tier, purpose);
    }

    /**
     * @notice Burn multiple fish tokens from approved operator (for zone access)
     * @dev User must approve FishingGame contract to burn their NFTs (approve or setApprovalForAll)
     */
    function burnBatchFromApproved(
        address from,
        uint256[] memory tokenIds,
        string memory purpose
    ) external {
        require(tokenIds.length > 0, "Empty array");
        
        Tier tier = tierOf[tokenIds[0]]; // Use first token's tier (should all be same)

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            address owner = _ownerOf(tokenId);
            require(owner == from, "Not owner");
            require(!isBurned[tokenId], "Already burned");
            require(tierOf[tokenId] == tier, "Mixed tiers");

            // Check if msg.sender is authorized (owner, approved, or operator)
            require(
                msg.sender == owner ||
                msg.sender == getApproved(tokenId) ||
                isApprovedForAll(owner, msg.sender),
                "Not authorized"
            );

            isBurned[tokenId] = true;
            _burn(tokenId);
        }

        emit FishBurned(from, tokenIds, tier, purpose);
    }

    /**
     * @notice Check if user has enough fish of specific tier for burn requirement
     */
    function checkBurnRequirement(
        address user,
        Tier tier,
        uint256 amount
    ) external view returns (bool hasEnough, uint256[] memory availableIds) {
        require(tier != Tier.Junk, "Cannot burn junk");
        
        uint256 count = 0;
        uint256[] memory tempIds = new uint256[](1000); // Max temp size
        uint256 maxTokenId = nextTokenId;

        for (uint256 i = 1; i <= maxTokenId && count < amount; i++) {
            if (_ownerOf(i) == user && tierOf[i] == tier && !isBurned[i]) {
                tempIds[count] = i;
                count++;
            }
        }

        if (count >= amount) {
            // Copy to properly sized array
            availableIds = new uint256[](amount);
            for (uint256 i = 0; i < amount; i++) {
                availableIds[i] = tempIds[i];
            }
            return (true, availableIds);
        }

        return (false, new uint256[](0));
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
