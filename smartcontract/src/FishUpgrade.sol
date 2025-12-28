// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FishNFT} from "./FishNFT.sol";
import {ISupraRouter} from "./interfaces/ISupraRouter.sol";

/**
 * @title FishUpgrade
 * @notice Upgrade system for Fish NFTs
 * 
 * Upgrade paths:
 * - Common → Rare: Burn 5 Common, 100% success
 * - Rare → Epic: Burn 3 Rare, 40% success (VRF), 60% destroy
 * 
 * Epic → Legendary is NOT available in MVP
 */
contract FishUpgrade {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum UpgradeType {
        CommonToRare,  // Burn 5 Common → 1 Rare (100%)
        RareToEpic     // Burn 3 Rare → 1 Epic (40% VRF) or destroy (60%)
    }

    // VRF request state for Rare → Epic upgrades
    struct UpgradeRequest {
        address user;
        uint256[] tokenIds; // Token IDs to be burned
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event UpgradeRequested(
        address indexed user,
        UpgradeType upgradeType,
        uint256 indexed requestId,
        uint256[] tokenIds
    );

    event UpgradeSucceeded(
        address indexed user,
        UpgradeType upgradeType,
        uint256 indexed newTokenId,
        uint256[] burnedTokenIds
    );

    event UpgradeFailed(
        address indexed user,
        UpgradeType upgradeType,
        uint256[] burnedTokenIds,
        string reason
    );

    event SupraVRFConfigUpdated(address router, uint256 numConfirmations);

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public admin;
    FishNFT public fishNFT;
    
    // Supra VRF configuration (for Rare → Epic 40% success rate)
    ISupraRouter public supraRouter;
    uint256 public supraNumConfirmations;
    string public constant SUPRA_CALLBACK_SIG = "upgradeVRFCallback(uint256,uint256[],uint256)";

    // Request mapping: Supra requestId => UpgradeRequest
    mapping(uint256 => UpgradeRequest) public upgradeRequests;

    // Upgrade requirements
    uint256 public constant COMMON_TO_RARE_BURN_COUNT = 5;
    uint256 public constant RARE_TO_EPIC_BURN_COUNT = 3;
    uint256 public constant RARE_TO_EPIC_SUCCESS_RATE_BPS = 4000; // 40% = 4000 bps

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlySupraRouter() {
        require(msg.sender == address(supraRouter), "Not Supra Router");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _admin, FishNFT _fishNFT) {
        require(_admin != address(0), "Admin zero");
        require(address(_fishNFT) != address(0), "NFT zero");

        admin = _admin;
        fishNFT = _fishNFT;
    }

    // -------------------------------------------------------------------------
    // Admin functions
    // -------------------------------------------------------------------------

    function setAdmin(address _admin) external onlyAdmin {
        require(_admin != address(0), "Admin zero");
        admin = _admin;
    }

    function setSupraVRFConfig(
        address _router,
        uint256 _numConfirmations
    ) external onlyAdmin {
        require(_router != address(0), "Router zero");
        require(_numConfirmations > 0, "Invalid confirmations");
        supraRouter = ISupraRouter(_router);
        supraNumConfirmations = _numConfirmations;
        emit SupraVRFConfigUpdated(_router, _numConfirmations);
    }

    // -------------------------------------------------------------------------
    // Upgrade functions
    // -------------------------------------------------------------------------

    /**
     * @notice Upgrade Common to Rare (100% success)
     * @param tokenIds Array of 5 Common token IDs to burn
     * @dev User must approve this contract to burn their NFTs
     */
    function upgradeCommonToRare(uint256[] calldata tokenIds) external {
        require(tokenIds.length == COMMON_TO_RARE_BURN_COUNT, "Wrong count");
        
        address user = msg.sender;

        // Verify all tokens are Common tier and owned by user
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(fishNFT.ownerOf(tokenId) == user, "Not owner");
            require(fishNFT.tierOf(tokenId) == FishNFT.Tier.Common, "Not Common");
            require(!fishNFT.isBurned(tokenId), "Already burned");
        }

        // Burn all Common tokens
        string memory purpose = "upgrade_common_to_rare";
        fishNFT.burnBatchFromApproved(user, tokenIds, purpose);

        // Mint 1 Rare token (100% success)
        // Note: FishNFT.mintFish now accepts upgradeContract as minter
        uint256 newTokenId = fishNFT.mintFish(user, FishNFT.Tier.Rare);

        emit UpgradeSucceeded(user, UpgradeType.CommonToRare, newTokenId, tokenIds);
    }

    /**
     * @notice Upgrade Rare to Epic (40% success via VRF)
     * @param tokenIds Array of 3 Rare token IDs to burn
     * @dev User must approve this contract to burn their NFTs
     * @dev This function requests VRF and processes upgrade in callback
     */
    function upgradeRareToEpic(uint256[] calldata tokenIds) external returns (uint256 requestId) {
        require(tokenIds.length == RARE_TO_EPIC_BURN_COUNT, "Wrong count");
        require(address(supraRouter) != address(0), "VRF not configured");
        
        address user = msg.sender;

        // Verify all tokens are Rare tier and owned by user
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(fishNFT.ownerOf(tokenId) == user, "Not owner");
            require(fishNFT.tierOf(tokenId) == FishNFT.Tier.Rare, "Not Rare");
            require(!fishNFT.isBurned(tokenId), "Already burned");
        }

        // Generate client seed
        uint256 clientSeed = uint256(keccak256(abi.encodePacked(user, block.timestamp, block.prevrandao)));
        
        // Request VRF for success rate (40%)
        requestId = supraRouter.generateRequest(
            SUPRA_CALLBACK_SIG,
            1, // rngCount: we only need 1 random number
            supraNumConfirmations,
            clientSeed,
            address(this)
        );
        
        // Store request info (need to convert calldata to memory for storage)
        uint256[] memory tokenIdsMemory = new uint256[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenIdsMemory[i] = tokenIds[i];
        }
        upgradeRequests[requestId] = UpgradeRequest({user: user, tokenIds: tokenIdsMemory});

        emit UpgradeRequested(user, UpgradeType.RareToEpic, requestId, tokenIds);
    }

    /**
     * @notice VRF callback for Rare → Epic upgrade
     * @param _requestId The request ID from Supra VRF
     * @param _rngList Array of random numbers (we use the first one)
     */
    function upgradeVRFCallback(
        uint256 _requestId,
        uint256[] memory _rngList
    ) external onlySupraRouter {
        UpgradeRequest memory req = upgradeRequests[_requestId];
        require(req.user != address(0), "Unknown request");
        require(_rngList.length > 0, "No random numbers");

        delete upgradeRequests[_requestId];

        // Use first random number to determine success (40% = 4000 bps)
        uint256 randomWord = _rngList[0];
        uint256 roll = randomWord % 10000; // 0-9999

        bool success = roll < RARE_TO_EPIC_SUCCESS_RATE_BPS; // < 4000 = success (40%)

        // Burn the Rare tokens
        string memory purpose = success ? "upgrade_rare_to_epic_success" : "upgrade_rare_to_epic_fail";
        fishNFT.burnBatchFromApproved(req.user, req.tokenIds, purpose);

        if (success) {
            // 40%: Mint 1 Epic token
            // Note: FishNFT.mintFish now accepts upgradeContract as minter
            uint256 newTokenId = fishNFT.mintFish(req.user, FishNFT.Tier.Epic);
            emit UpgradeSucceeded(req.user, UpgradeType.RareToEpic, newTokenId, req.tokenIds);
        } else {
            // 60%: All tokens destroyed, nothing minted
            emit UpgradeFailed(req.user, UpgradeType.RareToEpic, req.tokenIds, "VRF roll failed");
        }
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    /**
     * @notice Check if user has enough fish for upgrade
     */
    function canUpgradeCommonToRare(address user) external view returns (bool, uint256[] memory) {
        (bool hasEnough, uint256[] memory tokenIds) = fishNFT.checkBurnRequirement(
            user,
            FishNFT.Tier.Common,
            COMMON_TO_RARE_BURN_COUNT
        );
        return (hasEnough, tokenIds);
    }

    /**
     * @notice Check if user has enough fish for upgrade
     */
    function canUpgradeRareToEpic(address user) external view returns (bool, uint256[] memory) {
        (bool hasEnough, uint256[] memory tokenIds) = fishNFT.checkBurnRequirement(
            user,
            FishNFT.Tier.Rare,
            RARE_TO_EPIC_BURN_COUNT
        );
        return (hasEnough, tokenIds);
    }

    /**
     * @notice Get upgrade request info
     */
    function getUpgradeRequest(uint256 requestId) external view returns (address user, uint256[] memory tokenIds) {
        UpgradeRequest memory req = upgradeRequests[requestId];
        return (req.user, req.tokenIds);
    }
}
