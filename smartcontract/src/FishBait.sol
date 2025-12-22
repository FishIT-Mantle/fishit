// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FishBait
 * @notice Manages bait inventory and purchases for FishIt game.
 * 
 * Bait prices (from PRD):
 * - Common Bait: 1 MNT
 * - Rare Bait: 2 MNT
 * - Epic Bait: 4 MNT
 * 
 * Users purchase bait which is stored as ERC-20 style balance.
 * Only the FishingGame contract can consume bait.
 */
contract FishBait {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum BaitType {
        Common,
        Rare,
        Epic
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event BaitPurchased(
        address indexed user,
        BaitType indexed baitType,
        uint256 amount,
        uint256 totalCost
    );

    event BaitConsumed(
        address indexed user,
        BaitType indexed baitType,
        uint256 amount
    );

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public admin;
    
    // Only FishingGame can consume bait
    address public fishingGame;

    // Bait prices in MNT (wei)
    uint256 public constant COMMON_PRICE = 1 ether;  // 1 MNT
    uint256 public constant RARE_PRICE = 2 ether;    // 2 MNT
    uint256 public constant EPIC_PRICE = 4 ether;    // 4 MNT

    // User bait balances: user => baitType => amount
    mapping(address => mapping(BaitType => uint256)) public baitBalance;

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyGame() {
        require(msg.sender == fishingGame, "Not game");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _admin) {
        require(_admin != address(0), "Admin zero");
        admin = _admin;
    }

    // -------------------------------------------------------------------------
    // Admin functions
    // -------------------------------------------------------------------------

    function setAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Admin zero");
        admin = _newAdmin;
    }

    function setFishingGame(address _game) external onlyAdmin {
        require(_game != address(0), "Game zero");
        fishingGame = _game;
    }

    // -------------------------------------------------------------------------
    // Public functions
    // -------------------------------------------------------------------------

    /**
     * @notice Purchase bait tokens
     * @param baitType Type of bait to purchase
     * @param amount Amount of bait to purchase
     */
    function purchaseBait(BaitType baitType, uint256 amount) external payable {
        require(amount > 0, "Amount zero");
        
        uint256 price = _getBaitPrice(baitType);
        uint256 totalCost = price * amount;
        
        require(msg.value >= totalCost, "Insufficient payment");

        // Update balance
        baitBalance[msg.sender][baitType] += amount;

        // Refund excess
        if (msg.value > totalCost) {
            (bool refundOk, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(refundOk, "Refund failed");
        }

        emit BaitPurchased(msg.sender, baitType, amount, totalCost);
    }

    /**
     * @notice Get bait price
     */
    function getBaitPrice(BaitType baitType) external pure returns (uint256) {
        return _getBaitPrice(baitType);
    }

    /**
     * @notice Get user's bait balance
     */
    function balanceOf(address user, BaitType baitType) external view returns (uint256) {
        return baitBalance[user][baitType];
    }

    // -------------------------------------------------------------------------
    // Game functions (only FishingGame)
    // -------------------------------------------------------------------------

    /**
     * @notice Consume bait (called by FishingGame)
     * @param user User address
     * @param baitType Type of bait to consume
     * @param amount Amount to consume (usually 1)
     */
    function consumeBait(
        address user,
        BaitType baitType,
        uint256 amount
    ) external onlyGame {
        require(amount > 0, "Amount zero");
        require(baitBalance[user][baitType] >= amount, "Insufficient bait");

        baitBalance[user][baitType] -= amount;
        emit BaitConsumed(user, baitType, amount);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _getBaitPrice(BaitType baitType) internal pure returns (uint256) {
        if (baitType == BaitType.Common) return COMMON_PRICE;
        if (baitType == BaitType.Rare) return RARE_PRICE;
        if (baitType == BaitType.Epic) return EPIC_PRICE;
        revert("Invalid bait type");
    }
}
