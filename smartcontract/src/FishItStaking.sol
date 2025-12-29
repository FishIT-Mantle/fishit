// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FishItStaking
 * @notice License-based staking system for FishIt game.
 *
 * - Staking MNT grants license tiers for zone access:
 *   - < 100 MNT: No license (Zone 1 only)
 *   - ≥ 100 MNT: License I (Zone 2)
 *   - ≥ 250 MNT: License II (Zone 3)
 *   - ≥ 500 MNT: License III (Zone 4)
 * - Unstake requires 3-day cooldown.
 * - No yield/rewards (controlled economy).
 * - License tiers do NOT affect drop rates.
 *
 * Access control:
 * - Simple multi-sig style: admin is a single address that should be a multisig.
 */
contract FishItStaking {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Staked(address indexed user, uint256 amount, uint8 licenseTier);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 availableAt);
    event UnstakeExecuted(address indexed user, uint256 amount);

    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public admin; // should be set to multisig

    // Total staked native MNT
    uint256 public totalStaked;

    // Per-user principal stake (in wei)
    mapping(address => uint256) public stakes;

    // Unstake cooldown: 3 days
    uint256 public constant UNSTAKE_COOLDOWN = 3 days;

    // Unstake requests: user => amount requested
    mapping(address => uint256) public unstakeRequestAmount;

    // Unstake requests: user => timestamp when unstake can be executed
    mapping(address => uint256) public unstakeAvailableAt;

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

    constructor(address _admin) {
        require(_admin != address(0), "Admin zero");
        admin = _admin;
    }

    // -------------------------------------------------------------------------
    // Admin functions
    // -------------------------------------------------------------------------

    function setAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Admin zero");
        emit AdminUpdated(admin, _newAdmin);
        admin = _newAdmin;
    }


    // -------------------------------------------------------------------------
    // Staking logic (native MNT)
    // -------------------------------------------------------------------------

    /**
     * @notice Stake native MNT to get license tier.
     * - License tiers: <100 (none), ≥100 (I), ≥250 (II), ≥500 (III)
     * - No minimum, but license requirements enforced by ZoneValidator
     */
    function stake() external payable {
        require(msg.value > 0, "Zero amount");

        stakes[msg.sender] += msg.value;
        totalStaked += msg.value;

        uint8 newTier = _getLicenseTier(stakes[msg.sender]);

        emit Staked(msg.sender, msg.value, newTier);
    }

    /**
     * @notice Request unstake. Unstake can be executed after 3-day cooldown.
     * @param amount Amount to unstake
     */
    function requestUnstake(uint256 amount) external {
        uint256 staked = stakes[msg.sender];
        require(amount > 0, "Zero amount");
        require(staked >= amount, "Insufficient stake");
        require(unstakeRequestAmount[msg.sender] == 0, "Unstake already requested");

        unstakeRequestAmount[msg.sender] = amount;
        unstakeAvailableAt[msg.sender] = block.timestamp + UNSTAKE_COOLDOWN;

        emit UnstakeRequested(msg.sender, amount, unstakeAvailableAt[msg.sender]);
    }

    /**
     * @notice Execute unstake after cooldown period
     */
    function executeUnstake() external {
        uint256 amount = unstakeRequestAmount[msg.sender];
        require(amount > 0, "No unstake request");
        require(block.timestamp >= unstakeAvailableAt[msg.sender], "Cooldown active");

        uint256 staked = stakes[msg.sender];
        require(staked >= amount, "Insufficient stake");

        // Clear request
        delete unstakeRequestAmount[msg.sender];
        delete unstakeAvailableAt[msg.sender];

        // Update stakes
        stakes[msg.sender] = staked - amount;
        totalStaked -= amount;

        // Transfer principal
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Transfer failed");

        emit UnstakeExecuted(msg.sender, amount);
    }

    /**
     * @notice Cancel unstake request
     */
    function cancelUnstakeRequest() external {
        require(unstakeRequestAmount[msg.sender] > 0, "No unstake request");
        delete unstakeRequestAmount[msg.sender];
        delete unstakeAvailableAt[msg.sender];
    }

    // -------------------------------------------------------------------------
    // License API
    // -------------------------------------------------------------------------

    /**
     * @notice Get license tier for a user based on stake amount
     * @return tier 0 = none, 1 = License I, 2 = License II, 3 = License III
     */
    function getLicenseTier(address user) external view returns (uint8) {
        return _getLicenseTier(stakes[user]);
    }

    /**
     * @notice Internal function to calculate license tier from stake amount
     */
    function _getLicenseTier(uint256 stakeAmount) internal pure returns (uint8) {
        if (stakeAmount >= 500 ether) return 3; // License III (Zone 4)
        if (stakeAmount >= 250 ether) return 2; // License II (Zone 3)
        if (stakeAmount >= 100 ether) return 1; // License I (Zone 2)
        return 0; // No license (Zone 1 only)
    }

    /**
     * @notice Get unstake request info for user
     */
    function getUnstakeRequest(address user) external view returns (uint256 amount, uint256 availableAt) {
        return (unstakeRequestAmount[user], unstakeAvailableAt[user]);
        }

}


