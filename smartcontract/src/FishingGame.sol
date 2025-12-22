// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FishItStaking} from "./FishItStaking.sol";
import {FishNFT} from "./FishNFT.sol";
import {ZoneValidator} from "./ZoneValidator.sol";
import {FishBait} from "./FishBait.sol";
import {ISupraRouter} from "./interfaces/ISupraRouter.sol";

/**
 * @title FishingGame
 * @notice Core fishing gameplay logic with zone-based system:
 *  - 4 zones with different requirements and drop tables
 *  - Zone access requires license (staking), burn requirements, and entry fees
 *  - Consumes bait from FishBait contract
 *  - Uses Supra VRF for verifiable randomness
 *  - Mints FishNFT with zone & bait-specific drop tables (including Junk tier)
 *  - All fees go to revenue (controlled economy, no reward pool)
 *
 * Zones:
 *  - Zone 1 (Shallow): No requirements, all baits, onboarding zone
 *  - Zone 2 (Reef): License I (≥100 MNT), burn 3 Common
 *  - Zone 3 (Deep Sea): License II (≥250 MNT), burn 2 Rare, entry fee 1 MNT
 *  - Zone 4 (Abyssal): License III (≥500 MNT), burn 1 Epic, entry fee 3 MNT, Epic bait only, cooldown 24h
 */
contract FishingGame {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum BaitType {
        Common,
        Rare,
        Epic
    }

    // Use Zone from ZoneValidator for consistency

    // VRF request state
    struct Request {
        address user;
        ZoneValidator.Zone zone;
        BaitType bait;
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event SupraVRFConfigUpdated(address router, uint256 numConfirmations);
    event ZoneValidatorUpdated(address indexed oldValidator, address indexed newValidator);
    event FishBaitUpdated(address indexed oldBait, address indexed newBait);

    event CastLineRequested(
        address indexed user,
        ZoneValidator.Zone zone,
        BaitType bait,
        uint256 indexed requestId
    );

    event FishCaught(
        address indexed user,
        uint256 indexed tokenId,
        FishNFT.Tier tier,
        ZoneValidator.Zone zone,
        BaitType bait,
        uint256 randomWord
    );

    event ZoneAccessDenied(
        address indexed user,
        ZoneValidator.Zone zone,
        string reason
    );

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public admin;

    FishItStaking public staking;
    FishNFT public fishNFT;
    ZoneValidator public zoneValidator;
    FishBait public fishBait;

    // Supra VRF configuration
    ISupraRouter public supraRouter;
    uint256 public supraNumConfirmations; // Number of block confirmations before callback
    string public constant SUPRA_CALLBACK_SIG = "supraVRFCallback(uint256,uint256[],uint256)";

    // Request mapping: Supra requestId => Request
    mapping(uint256 => Request) public requests;

    // Revenue receiver (treasury / multisig)
    address public revenueRecipient;

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

    constructor(
        address _admin,
        FishItStaking _staking,
        FishNFT _fishNFT,
        ZoneValidator _zoneValidator,
        FishBait _fishBait,
        address _revenueRecipient
    ) {
        require(_admin != address(0), "Admin zero");
        require(address(_staking) != address(0), "Staking zero");
        require(address(_fishNFT) != address(0), "NFT zero");
        require(address(_zoneValidator) != address(0), "Validator zero");
        require(address(_fishBait) != address(0), "Bait zero");
        require(_revenueRecipient != address(0), "Revenue zero");

        admin = _admin;
        staking = _staking;
        fishNFT = _fishNFT;
        zoneValidator = _zoneValidator;
        fishBait = _fishBait;
        revenueRecipient = _revenueRecipient;
    }

    // -------------------------------------------------------------------------
    // Admin configuration
    // -------------------------------------------------------------------------

    function setAdmin(address _admin) external onlyAdmin {
        require(_admin != address(0), "Admin zero");
        admin = _admin;
    }

    function setRevenueRecipient(address _recipient) external onlyAdmin {
        require(_recipient != address(0), "Recipient zero");
        revenueRecipient = _recipient;
    }

    function setZoneValidator(ZoneValidator _validator) external onlyAdmin {
        require(address(_validator) != address(0), "Validator zero");
        emit ZoneValidatorUpdated(address(zoneValidator), address(_validator));
        zoneValidator = _validator;
    }

    function setFishBait(FishBait _bait) external onlyAdmin {
        require(address(_bait) != address(0), "Bait zero");
        emit FishBaitUpdated(address(fishBait), address(_bait));
        fishBait = _bait;
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
    // Gameplay: cast line
    // -------------------------------------------------------------------------

    /**
     * @notice Cast line in a specific zone
     * @param zone Zone to fish in
     * @param baitType Bait type to use (must have balance in FishBait contract)
     */
    function castLine(ZoneValidator.Zone zone, BaitType baitType) external payable returns (uint256 requestId) {
        address user = msg.sender;

        // 1. Validate zone access
        (bool canAccess, string memory reason) = zoneValidator.canAccessZone(user, zone);
        if (!canAccess) {
            emit ZoneAccessDenied(user, zone, reason);
            revert(reason);
        }

        // 2. Check Epic Bait only requirement for Zone 4
        if (zone == ZoneValidator.Zone.Abyssal && baitType != BaitType.Epic) {
            revert("Zone 4 requires Epic Bait only");
        }

        // 3. Check bait balance
        uint256 baitBalance = fishBait.balanceOf(user, _baitTypeToFishBait(baitType));
        require(baitBalance > 0, "Insufficient bait");

        // 4. Handle entry fee (Zone 3 & 4)
        uint256 entryFee = zoneValidator.getEntryFee(zone);
        if (entryFee > 0) {
            require(msg.value >= entryFee, "Insufficient entry fee");
            (bool sentFee, ) = revenueRecipient.call{value: entryFee}("");
            require(sentFee, "Entry fee transfer failed");

            // Refund excess
            if (msg.value > entryFee) {
                (bool refundOk, ) = user.call{value: msg.value - entryFee}("");
                require(refundOk, "Refund failed");
            }
        } else {
            // Refund if user sent value but no entry fee required
            if (msg.value > 0) {
                (bool refundOk, ) = user.call{value: msg.value}("");
                require(refundOk, "Refund failed");
            }
        }

        // 5. Handle burn requirements (Zone 2, 3, 4)
        (FishNFT.Tier burnTier, uint256 burnAmount) = zoneValidator.getBurnRequirement(zone);
        if (burnAmount > 0) {
            // Check if user has enough fish to burn
            (bool hasEnough, uint256[] memory tokenIds) = fishNFT.checkBurnRequirement(
                user,
                burnTier,
                burnAmount
            );
            require(hasEnough, "Insufficient fish to burn");

            // Convert memory array to calldata-compatible format
            uint256[] memory burnIds = new uint256[](burnAmount);
            for (uint256 i = 0; i < burnAmount; i++) {
                burnIds[i] = tokenIds[i];
            }
            string memory purpose = _getZoneBurnPurpose(zone);
            
            // User must approve FishingGame to burn their NFTs (approve or setApprovalForAll)
            // burnBatchFromApproved will check authorization
            fishNFT.burnBatchFromApproved(user, burnIds, purpose);
        }

        // 6. Consume bait
        fishBait.consumeBait(user, _baitTypeToFishBait(baitType), 1);

        // 7. Record zone access (for cooldown tracking)
        zoneValidator.recordZoneAccess(user, zone);

        // 8. Request Supra VRF randomness
        require(address(supraRouter) != address(0), "VRF not configured");
        
        // Generate client seed from user address and block data for additional randomness
        uint256 clientSeed = uint256(keccak256(abi.encodePacked(user, block.timestamp, block.prevrandao)));
        
        // Request 1 random number with configured confirmations
        requestId = supraRouter.generateRequest(
            SUPRA_CALLBACK_SIG,
            1, // rngCount: we only need 1 random number
            supraNumConfirmations,
            clientSeed,
            address(this)
        );
        
        // Store request info for callback
        requests[requestId] = Request({user: user, zone: zone, bait: baitType});

        emit CastLineRequested(user, zone, baitType, requestId);
    }

    // -------------------------------------------------------------------------
    // Supra VRF callback
    // -------------------------------------------------------------------------

    /**
     * @notice Called by Supra Router with randomness.
     * @param _requestId The request ID from Supra VRF
     * @param _rngList Array of random numbers (we use the first one)
     * @param _clientSeed The client seed that was sent with the request
     * @dev Function signature must match SUPRA_CALLBACK_SIG exactly
     */
    function supraVRFCallback(
        uint256 _requestId,
        uint256[] memory _rngList,
        uint256 _clientSeed
    ) external onlySupraRouter {
        Request memory req = requests[_requestId];
        require(req.user != address(0), "Unknown request");
        require(_rngList.length > 0, "No random numbers");

        delete requests[_requestId];

        // Use first random number from array
        uint256 randomWord = _rngList[0];
        
        // Determine tier based on zone, bait & randomWord (0-9999)
        uint256 roll = randomWord % 10000;
        FishNFT.Tier tier = _tierFromRoll(req.zone, req.bait, roll);

        // Mint NFT directly to user
        uint256 tokenId = fishNFT.mintFish(req.user, tier);

        // Emit event for backend to handle AI+IPFS
        emit FishCaught(req.user, tokenId, tier, req.zone, req.bait, randomWord);
    }

    // -------------------------------------------------------------------------
    // Drop table logic (zone & bait specific)
    // -------------------------------------------------------------------------

    /**
     * @notice Determine tier from roll based on zone and bait type
     * @dev Drop tables from PRD:
     *      Zone 1: Common Bait: Junk 40% | Common 45% | Rare 14% | Epic 1% | Legendary 0%
     *              Rare Bait: Junk 30% | Common 45% | Rare 22% | Epic 3% | Legendary 0%
     *              Epic Bait: Junk 20% | Common 40% | Rare 30% | Epic 9% | Legendary 1%
     *      Zone 2: Common Bait: Junk 30% | Common 30% | Rare 28% | Epic 10% | Legendary 2%
     *              Rare Bait: Junk 20% | Common 30% | Rare 35% | Epic 12% | Legendary 3%
     *              Epic Bait: Junk 15% | Common 25% | Rare 35% | Epic 20% | Legendary 5%
     *      Zone 3: All baits: Junk 20% | Common 15% | Rare 30% | Epic 25% | Legendary 10%
     *      Zone 4: Junk 15% | Rare 20% | Epic 40% | Legendary 25%
     */
    function _tierFromRoll(
        ZoneValidator.Zone zone,
        BaitType bait,
        uint256 roll
    ) internal pure returns (FishNFT.Tier) {
        if (zone == ZoneValidator.Zone.Shallow) {
            return _shallowZoneDrop(bait, roll);
        } else if (zone == ZoneValidator.Zone.Reef) {
            return _reefZoneDrop(bait, roll);
        } else if (zone == ZoneValidator.Zone.DeepSea) {
            return _deepSeaZoneDrop(roll);
        } else if (zone == ZoneValidator.Zone.Abyssal) {
            return _abyssalZoneDrop(roll);
        }
        revert("Invalid zone");
    }

    function _shallowZoneDrop(BaitType bait, uint256 roll) internal pure returns (FishNFT.Tier) {
        if (bait == BaitType.Common) {
            if (roll < 4000) return FishNFT.Tier.Junk;
            if (roll < 8500) return FishNFT.Tier.Common;
            if (roll < 9900) return FishNFT.Tier.Rare;
            if (roll < 10000) return FishNFT.Tier.Epic;
            return FishNFT.Tier.Legendary; // 0%, should not happen
        } else if (bait == BaitType.Rare) {
            if (roll < 3000) return FishNFT.Tier.Junk;
            if (roll < 7500) return FishNFT.Tier.Common;
            if (roll < 9700) return FishNFT.Tier.Rare;
            if (roll < 10000) return FishNFT.Tier.Epic;
            return FishNFT.Tier.Legendary; // 0%, should not happen
        } else { // Epic
            if (roll < 2000) return FishNFT.Tier.Junk;
            if (roll < 6000) return FishNFT.Tier.Common;
            if (roll < 9000) return FishNFT.Tier.Rare;
            if (roll < 9900) return FishNFT.Tier.Epic;
            return FishNFT.Tier.Legendary; // 1%
        }
    }

    function _reefZoneDrop(BaitType bait, uint256 roll) internal pure returns (FishNFT.Tier) {
        if (bait == BaitType.Common) {
            if (roll < 3000) return FishNFT.Tier.Junk;
            if (roll < 6000) return FishNFT.Tier.Common;
            if (roll < 8800) return FishNFT.Tier.Rare;
            if (roll < 9800) return FishNFT.Tier.Epic;
            return FishNFT.Tier.Legendary; // 2%
        } else if (bait == BaitType.Rare) {
            if (roll < 2000) return FishNFT.Tier.Junk;
            if (roll < 5000) return FishNFT.Tier.Common;
            if (roll < 8500) return FishNFT.Tier.Rare;
            if (roll < 9700) return FishNFT.Tier.Epic;
            return FishNFT.Tier.Legendary; // 3%
        } else { // Epic
            if (roll < 1500) return FishNFT.Tier.Junk;
            if (roll < 4000) return FishNFT.Tier.Common;
            if (roll < 7500) return FishNFT.Tier.Rare;
            if (roll < 9500) return FishNFT.Tier.Epic;
            return FishNFT.Tier.Legendary; // 5%
        }
    }

    function _deepSeaZoneDrop(uint256 roll) internal pure returns (FishNFT.Tier) {
        // Zone 3: Same drop table for all baits
        // Junk 20% | Common 15% | Rare 30% | Epic 25% | Legendary 10%
        if (roll < 2000) return FishNFT.Tier.Junk;
        if (roll < 3500) return FishNFT.Tier.Common;
        if (roll < 6500) return FishNFT.Tier.Rare;
        if (roll < 9000) return FishNFT.Tier.Epic;
        return FishNFT.Tier.Legendary; // 10%
    }

    function _abyssalZoneDrop(uint256 roll) internal pure returns (FishNFT.Tier) {
        // Zone 4: Junk 15% | Rare 20% | Epic 40% | Legendary 25%
        // Note: No Common in Zone 4
        if (roll < 1500) return FishNFT.Tier.Junk;
        if (roll < 3500) return FishNFT.Tier.Rare;
        if (roll < 7500) return FishNFT.Tier.Epic;
        return FishNFT.Tier.Legendary; // 25%
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _baitTypeToFishBait(BaitType bait) internal pure returns (FishBait.BaitType) {
        if (bait == BaitType.Common) return FishBait.BaitType.Common;
        if (bait == BaitType.Rare) return FishBait.BaitType.Rare;
        if (bait == BaitType.Epic) return FishBait.BaitType.Epic;
        revert("Invalid bait");
    }

    function _getZoneBurnPurpose(ZoneValidator.Zone zone) internal pure returns (string memory) {
        if (zone == ZoneValidator.Zone.Reef) return "zone2_access";
        if (zone == ZoneValidator.Zone.DeepSea) return "zone3_access";
        if (zone == ZoneValidator.Zone.Abyssal) return "zone4_access";
        return "";
    }
}
