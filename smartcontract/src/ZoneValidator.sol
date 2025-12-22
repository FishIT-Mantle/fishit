// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FishItStaking} from "./FishItStaking.sol";
import {FishNFT} from "./FishNFT.sol";

/**
 * @title ZoneValidator
 * @notice Validates zone access requirements based on PRD:
 * 
 * Zone 1 (Shallow): No requirements
 * Zone 2 (Reef): Stake ≥100 MNT, Burn 3 Common
 * Zone 3 (Deep Sea): Stake ≥250 MNT, Burn 2 Rare, Entry fee 1 MNT
 * Zone 4 (Abyssal): Stake ≥500 MNT, Burn 1 Epic, Entry fee 3 MNT, Epic Bait only, Cooldown 24h
 */
contract ZoneValidator {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum Zone {
        Shallow,   // Zone 1
        Reef,      // Zone 2
        DeepSea,   // Zone 3
        Abyssal    // Zone 4
    }

    struct ZoneRequirements {
        uint256 minStake;      // Minimum stake for license (in wei)
        uint256 entryFee;      // Entry fee in wei
        FishNFT.Tier burnTier; // Tier to burn (0 = none)
        uint256 burnAmount;    // Amount to burn
        bool epicBaitOnly;     // Zone 4 requires Epic Bait only
        uint256 cooldown;      // Cooldown in seconds (0 = none)
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event ZoneAccessRecorded(address indexed user, Zone zone, uint256 timestamp);
    event ZoneRequirementsUpdated(Zone zone, ZoneRequirements requirements);

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public admin;
    FishItStaking public staking;
    FishNFT public fishNFT;

    // Zone requirements
    mapping(Zone => ZoneRequirements) public zoneRequirements;

    // Last zone access timestamp per user per zone (for cooldown)
    mapping(address => mapping(Zone => uint256)) public lastZoneAccess;

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(
        address _admin,
        FishItStaking _staking,
        FishNFT _fishNFT
    ) {
        require(_admin != address(0), "Admin zero");
        require(address(_staking) != address(0), "Staking zero");
        require(address(_fishNFT) != address(0), "NFT zero");

        admin = _admin;
        staking = _staking;
        fishNFT = _fishNFT;

        // Initialize zone requirements from PRD
        zoneRequirements[Zone.Shallow] = ZoneRequirements({
            minStake: 0,
            entryFee: 0,
            burnTier: FishNFT.Tier.Common, // Will be ignored (burnAmount = 0)
            burnAmount: 0,
            epicBaitOnly: false,
            cooldown: 0
        });

        zoneRequirements[Zone.Reef] = ZoneRequirements({
            minStake: 100 ether, // 100 MNT
            entryFee: 0,
            burnTier: FishNFT.Tier.Common,
            burnAmount: 3,
            epicBaitOnly: false,
            cooldown: 0
        });

        zoneRequirements[Zone.DeepSea] = ZoneRequirements({
            minStake: 250 ether, // 250 MNT
            entryFee: 1 ether,   // 1 MNT
            burnTier: FishNFT.Tier.Rare,
            burnAmount: 2,
            epicBaitOnly: false,
            cooldown: 0
        });

        zoneRequirements[Zone.Abyssal] = ZoneRequirements({
            minStake: 500 ether, // 500 MNT
            entryFee: 3 ether,   // 3 MNT
            burnTier: FishNFT.Tier.Epic,
            burnAmount: 1,
            epicBaitOnly: true,
            cooldown: 1 days     // 24 hours
        });
    }

    // -------------------------------------------------------------------------
    // Admin functions
    // -------------------------------------------------------------------------

    function setAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Admin zero");
        admin = _newAdmin;
    }

    function updateZoneRequirements(
        Zone zone,
        ZoneRequirements calldata requirements
    ) external onlyAdmin {
        zoneRequirements[zone] = requirements;
        emit ZoneRequirementsUpdated(zone, requirements);
    }

    // -------------------------------------------------------------------------
    // Validation functions
    // -------------------------------------------------------------------------

    /**
     * @notice Check if user can access a zone
     * @param user User address
     * @param zone Zone to access
     * @return canAccess True if user can access
     * @return reason Reason string if cannot access
     */
    function canAccessZone(
        address user,
        Zone zone
    ) external view returns (bool canAccess, string memory reason) {
        ZoneRequirements memory reqs = zoneRequirements[zone];

        // Check license (stake requirement)
        if (reqs.minStake > 0) {
            uint256 userStake = staking.stakes(user);
            if (userStake < reqs.minStake) {
                return (false, "Insufficient stake for license");
            }
        }

        // Check cooldown (for Zone 4)
        if (reqs.cooldown > 0) {
            uint256 lastAccess = lastZoneAccess[user][zone];
            if (lastAccess > 0) {
                uint256 nextAccess = lastAccess + reqs.cooldown;
                if (block.timestamp < nextAccess) {
                    return (false, "Zone cooldown active");
                }
            }
        }

        return (true, "");
    }

    /**
     * @notice Get entry fee for a zone
     */
    function getEntryFee(Zone zone) external view returns (uint256) {
        return zoneRequirements[zone].entryFee;
    }

    /**
     * @notice Get burn requirement for a zone
     */
    function getBurnRequirement(
        Zone zone
    ) external view returns (FishNFT.Tier tier, uint256 amount) {
        ZoneRequirements memory reqs = zoneRequirements[zone];
        return (reqs.burnTier, reqs.burnAmount);
    }

    /**
     * @notice Check if zone requires Epic Bait only
     */
    function requiresEpicBaitOnly(Zone zone) external view returns (bool) {
        return zoneRequirements[zone].epicBaitOnly;
    }

    /**
     * @notice Get next access time for user (considering cooldown)
     */
    function getNextAccessTime(
        address user,
        Zone zone
    ) external view returns (uint256) {
        ZoneRequirements memory reqs = zoneRequirements[zone];
        if (reqs.cooldown == 0) return 0;

        uint256 lastAccess = lastZoneAccess[user][zone];
        if (lastAccess == 0) return 0;

        return lastAccess + reqs.cooldown;
    }

    // -------------------------------------------------------------------------
    // Game functions (called by FishingGame after validation)
    // -------------------------------------------------------------------------

    /**
     * @notice Record zone access (called by FishingGame after successful entry)
     */
    function recordZoneAccess(address user, Zone zone) external {
        // In production, this should be onlyGame modifier
        // For now, we'll allow anyone to call it (FishingGame will call it)
        lastZoneAccess[user][zone] = block.timestamp;
        emit ZoneAccessRecorded(user, zone, block.timestamp);
    }
}
