// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FishItStaking, IFishItStaking} from "./FishItStaking.sol";
import {FishNFT} from "./FishNFT.sol";
import {ISupraRouter} from "./interfaces/ISupraRouter.sol";

/**
 * @title FishingGame
 * @notice Core fishing gameplay logic:
 *  - Consumes "energy" per cast.
 *  - Charges bait fees (in native MNT).
 *  - Uses Supra VRF for verifiable randomness.
 *  - Mints FishNFT with rarity distribution per bait type.
 *  - Allocates rewards via FishItStaking reward pool.
 *
 * This contract assumes:
 *  - Energy per day = sqrt(staked MNT) as defined in FishItStaking.
 *  - Backend listens to FishCaught events to generate AI image + IPFS.
 *
 * NOTE: Uses Supra VRF for Mantle Network compatibility.
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

    // VRF request state
    struct Request {
        address user;
        BaitType bait;
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event BaitPricesUpdated(uint256 commonPrice, uint256 rarePrice, uint256 epicPrice);
    event SupraVRFConfigUpdated(address router, uint256 numConfirmations);

    event CastLineRequested(
        address indexed user,
        BaitType bait,
        uint256 indexed requestId
    );

    event FishCaught(
        address indexed user,
        uint256 indexed tokenId,
        FishNFT.Rarity rarity,
        BaitType bait,
        uint256 randomWord
    );

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public admin;

    FishItStaking public staking;
    FishNFT public fishNFT;

    // Bait prices in native MNT (wei)
    uint256 public commonBaitPrice; // 0.05 MNT (on mainnet) - here configurable
    uint256 public rareBaitPrice;   // 0.15 MNT
    uint256 public epicBaitPrice;   // 0.50 MNT

    // Energy per cast (always 1 in PRD)
    uint256 public constant ENERGY_PER_CAST = 1;

    // Daily regeneration window (24h)
    uint256 public constant ENERGY_REGEN_INTERVAL = 1 days;

    // Per-user energy tracking
    mapping(address => uint256) public energySpentToday;
    mapping(address => uint256) public energyDayStart;

    // Supra VRF configuration
    ISupraRouter public supraRouter;
    uint256 public supraNumConfirmations; // Number of block confirmations before callback
    string public constant SUPRA_CALLBACK_SIG = "supraVRFCallback(uint256,uint256[],uint256)";

    // Request mapping: Supra requestId => Request
    mapping(uint256 => Request) public requests;

    // Reward parameters (hardcoded): fraction of bait fee into reward pool vs revenue
    // From PRD: 80% bait fees -> reward pool, 20% -> revenue.
    uint16 public constant BAIT_REWARD_BPS = 8000; // 80%
    uint16 public constant BPS_DENOMINATOR = 10000;

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
        address _revenueRecipient
    ) {
        require(_admin != address(0), "Admin zero");
        require(address(_staking) != address(0), "Staking zero");
        require(address(_fishNFT) != address(0), "NFT zero");
        require(_revenueRecipient != address(0), "Revenue zero");

        admin = _admin;
        staking = _staking;
        fishNFT = _fishNFT;
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

    function setBaitPrices(
        uint256 _common,
        uint256 _rare,
        uint256 _epic
    ) external onlyAdmin {
        commonBaitPrice = _common;
        rareBaitPrice = _rare;
        epicBaitPrice = _epic;
        emit BaitPricesUpdated(_common, _rare, _epic);
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
    // Energy accounting
    // -------------------------------------------------------------------------

    function _refreshEnergy(address user) internal {
        uint256 dayStart = energyDayStart[user];
        if (block.timestamp >= dayStart + ENERGY_REGEN_INTERVAL) {
            // reset daily counters
            energyDayStart[user] = block.timestamp;
            energySpentToday[user] = 0;
        }
    }

    function availableEnergy(address user) public view returns (uint256) {
        uint256 staked = staking.stakes(user);
        if (staked == 0) return 0;

        // approximate energy per day via same sqrt function as staking
        uint256 perDay = _sqrt(staked);

        uint256 spent = energySpentToday[user];
        if (block.timestamp >= energyDayStart[user] + ENERGY_REGEN_INTERVAL) {
            // new day, none spent yet
            spent = 0;
        }

        if (perDay <= spent) return 0;
        return perDay - spent;
    }

    // -------------------------------------------------------------------------
    // Gameplay: cast line
    // -------------------------------------------------------------------------

    function castLine(BaitType bait) external payable returns (uint256 requestId) {
        // 1. Check energy
        _refreshEnergy(msg.sender);
        require(availableEnergy(msg.sender) >= ENERGY_PER_CAST, "Not enough energy");

        // 2. Charge bait fee
        uint256 price = _priceForBait(bait);
        require(msg.value >= price, "Insufficient bait fee");

        // 3. Split bait fee into reward pool + revenue
        uint256 toReward = (price * BAIT_REWARD_BPS) / BPS_DENOMINATOR;
        uint256 toRevenue = price - toReward;

        // fund reward pool
        IFishItStaking(address(staking)).fundRewardPool{value: toReward}();

        // send to revenue
        (bool sentRev, ) = revenueRecipient.call{value: toRevenue}("");
        require(sentRev, "Revenue transfer failed");

        // refund dust if user overpaid
        if (msg.value > price) {
            (bool refundOk, ) = msg.sender.call{value: msg.value - price}("");
            require(refundOk, "Refund failed");
        }

        // 4. Consume energy
        energySpentToday[msg.sender] += ENERGY_PER_CAST;

        // 5. Request Supra VRF randomness
        require(address(supraRouter) != address(0), "VRF not configured");
        
        // Generate client seed from user address and block data for additional randomness
        uint256 clientSeed = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp, block.prevrandao)));
        
        // Request 1 random number with configured confirmations
        requestId = supraRouter.generateRequest(
            SUPRA_CALLBACK_SIG,
            1, // rngCount: we only need 1 random number
            supraNumConfirmations,
            clientSeed,
            address(this)
        );
        
        // Store request info for callback
        requests[requestId] = Request({user: msg.sender, bait: bait});

        emit CastLineRequested(msg.sender, bait, requestId);
    }

    function _priceForBait(BaitType bait) internal view returns (uint256) {
        if (bait == BaitType.Common) return commonBaitPrice;
        if (bait == BaitType.Rare) return rareBaitPrice;
        if (bait == BaitType.Epic) return epicBaitPrice;
        revert("Invalid bait");
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
        
        // Determine rarity based on bait & randomWord (0-9999)
        uint256 roll = randomWord % 10000;
        FishNFT.Rarity rarity = _rarityFromRoll(req.bait, roll);

        // Mint NFT directly to user
        uint256 tokenId = fishNFT.mintFish(req.user, rarity);

        // Emit event for backend to handle AI+IPFS
        emit FishCaught(req.user, tokenId, rarity, req.bait, randomWord);
    }

    function _rarityFromRoll(
        BaitType bait,
        uint256 roll
    ) internal pure returns (FishNFT.Rarity) {
        // probabilities *100 (for 0-9999 scale)
        // Common bait: 70% C, 25% R, 4.5% E, 0.5% L
        if (bait == BaitType.Common) {
            if (roll < 7000) return FishNFT.Rarity.Common;
            if (roll < 9500) return FishNFT.Rarity.Rare;
            if (roll < 9950) return FishNFT.Rarity.Epic;
            return FishNFT.Rarity.Legendary;
        }

        // Rare bait: 50% C, 35% R, 13% E, 2% L
        if (bait == BaitType.Rare) {
            if (roll < 5000) return FishNFT.Rarity.Common;
            if (roll < 8500) return FishNFT.Rarity.Rare;
            if (roll < 9800) return FishNFT.Rarity.Epic;
            return FishNFT.Rarity.Legendary;
        }

        // Epic bait: 30% C, 40% R, 25% E, 5% L
        if (roll < 3000) return FishNFT.Rarity.Common;
        if (roll < 7000) return FishNFT.Rarity.Rare;
        if (roll < 9500) return FishNFT.Rarity.Epic;
        return FishNFT.Rarity.Legendary;
    }

    // -------------------------------------------------------------------------
    // Internal math
    // -------------------------------------------------------------------------

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


