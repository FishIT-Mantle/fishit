// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FishItStaking
 * @notice Core staking pool for FishIt on Mantle Network.
 *
 * - Accepts native MNT deposits (testnet for now).
 * - No lock period, no fee on stake/unstake.
 * - Tracks per-user stake and computes "energy" budget off-chain as sqrt(stake),
 *   but also stores last energy update timestamps for game contracts.
 * - Exposes hooks for FishingGame and Marketplace via rewardPool balance.
 *
 * Economic parameters (hardcoded for v1, from PRD):
 * - Reward pool funded externally (bait fees, marketplace fees, premium).
 * - Effective APY and yield-boost calculations are handled off-chain / in a
 *   separate yield contract in later phases; here we only provide accounting
 *   stubs and a simple reward balance per user for MVP.
 *
 * Access control:
 * - Simple multi-sig style: admin is a single address that should be a multisig.
 */
interface IFishItStaking {
    function fundRewardPool() external payable;
}

contract FishItStaking is IFishItStaking {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardPoolFunded(address indexed from, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    event GameContractUpdated(address indexed oldGame, address indexed newGame);

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public admin; // should be set to multisig

    // Total staked native MNT
    uint256 public totalStaked;

    // Per-user principal stake (in wei)
    mapping(address => uint256) public stakes;

    // Simple reward balance per user (MNT from reward pool)
    mapping(address => uint256) public pendingRewards;

    // Reward pool balance (held in this contract as native MNT)
    uint256 public rewardPoolBalance;

    // The main game contract that can award rewards
    address public fishingGame;

    // Energy accounting: last time user energy was refreshed
    mapping(address => uint256) public lastEnergyUpdate;

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
        emit AdminUpdated(admin, _newAdmin);
        admin = _newAdmin;
    }

    function setFishingGame(address _game) external onlyAdmin {
        emit GameContractUpdated(fishingGame, _game);
        fishingGame = _game;
    }

    /**
     * @notice Fund the reward pool with native MNT.
     * This should be called by protocol fee collector / multisig.
     */
    function fundRewardPool() external payable {
        require(msg.value > 0, "No value");
        rewardPoolBalance += msg.value;
        emit RewardPoolFunded(msg.sender, msg.value);
    }

    // -------------------------------------------------------------------------
    // Staking logic (native MNT)
    // -------------------------------------------------------------------------

    /**
     * @notice Stake native MNT into the pool.
     * - Minimum 1 MNT is recommended by product spec, but that can be enforced off-chain for UX.
     */
    function stake() external payable {
        require(msg.value > 0, "Zero amount");

        stakes[msg.sender] += msg.value;
        totalStaked += msg.value;

        // update energy timestamp (used by FishingGame to compute daily energy)
        if (lastEnergyUpdate[msg.sender] == 0) {
            lastEnergyUpdate[msg.sender] = block.timestamp;
        }

        emit Staked(msg.sender, msg.value);
    }

    /**
     * @notice Unstake principal + (optionally) claim pending rewards.
     * @param amount Amount of principal to unstake.
     * @param shouldClaimRewards Whether to automatically claim pending rewards.
     *
     * Energy reset is expected in game contract via hooks when full unstake occurs.
     */
    function unstake(uint256 amount, bool shouldClaimRewards) external {
        uint256 staked = stakes[msg.sender];
        require(amount > 0, "Zero amount");
        require(staked >= amount, "Insufficient stake");

        stakes[msg.sender] = staked - amount;
        totalStaked -= amount;

        // transfer principal back
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Transfer failed");

        emit Unstaked(msg.sender, amount);

        if (shouldClaimRewards) {
            _claimRewardsInternal(msg.sender);
        }

        // If user fully unstakes, reset energy timestamp
        if (stakes[msg.sender] == 0) {
            lastEnergyUpdate[msg.sender] = 0;
        }
    }

    // -------------------------------------------------------------------------
    // Rewards API
    // -------------------------------------------------------------------------

    /**
     * @notice Called by FishingGame to allocate rewards to a user from the reward pool.
     * @dev Does not move funds yet, just updates accounting; payout happens on claim.
     */
    function allocateReward(address user, uint256 amount) external onlyGame {
        require(amount > 0, "Zero amount");
        require(rewardPoolBalance >= amount, "Insufficient pool");

        rewardPoolBalance -= amount;
        pendingRewards[user] += amount;
    }

    /**
     * @notice Claim all pending rewards for caller.
     */
    function claimRewards() external {
        _claimRewardsInternal(msg.sender);
    }

    function _claimRewardsInternal(address user) internal {
        uint256 reward = pendingRewards[user];
        if (reward == 0) return;

        pendingRewards[user] = 0;

        (bool sent, ) = user.call{value: reward}("");
        require(sent, "Reward transfer failed");

        emit RewardClaimed(user, reward);
    }

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    /**
     * @notice Helper to compute the "energy per day" off-chain formula from PRD:
     *         energy = sqrt(staked MNT)
     * @dev This is pure and does not consider regeneration timing; game contract
     *      will use staked amount + timestamps to enforce daily caps.
     */
    function computeEnergyPerDay(address user) external view returns (uint256) {
        uint256 staked = stakes[user];
        if (staked == 0) return 0;
        return _sqrt(staked);
    }

    /**
     * @dev Integer square root (Babylonian method), adapted for uint256.
     */
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}


