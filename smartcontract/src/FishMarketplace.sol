// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/token/ERC721/IERC721.sol";
import {
    IERC721Receiver
} from "@openzeppelin/token/ERC721/IERC721Receiver.sol";

contract FishMarketplace is IERC721Receiver {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    struct Listing {
        address seller;
        uint256 price; // in native MNT
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Listed(
        address indexed nft,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event Cancelled(
        address indexed nft,
        uint256 indexed tokenId,
        address indexed seller
    );
    event Purchased(
        address indexed nft,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price,
        uint256 fee
    );

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public admin;
    address public revenueRecipient;

    // marketplace fee: 2.5% = 250 bps (all goes to revenue in controlled economy)
    uint16 public constant FEE_BPS = 250;
    uint16 public constant BPS_DENOMINATOR = 10000;

    // nft => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

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
        address _revenueRecipient
    ) {
        require(_admin != address(0), "Admin zero");
        require(_revenueRecipient != address(0), "Revenue zero");
        admin = _admin;
        revenueRecipient = _revenueRecipient;
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setAdmin(address _admin) external onlyAdmin {
        require(_admin != address(0), "Admin zero");
        admin = _admin;
    }

    function setRevenueRecipient(address _recipient) external onlyAdmin {
        require(_recipient != address(0), "Recipient zero");
        revenueRecipient = _recipient;
    }

    // -------------------------------------------------------------------------
    // Listing logic
    // -------------------------------------------------------------------------

    function list(address nft, uint256 tokenId, uint256 price) external {
        require(price > 0, "Price zero");
        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            token.getApproved(tokenId) == address(this) ||
                token.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        listings[nft][tokenId] = Listing({seller: msg.sender, price: price});

        emit Listed(nft, tokenId, msg.sender, price);
    }

    function cancel(address nft, uint256 tokenId) external {
        Listing memory l = listings[nft][tokenId];
        require(l.seller != address(0), "Not listed");
        require(l.seller == msg.sender, "Not seller");

        delete listings[nft][tokenId];
        emit Cancelled(nft, tokenId, msg.sender);
    }

    function buy(address nft, uint256 tokenId) external payable {
        Listing memory l = listings[nft][tokenId];
        require(l.seller != address(0), "Not listed");
        require(msg.value >= l.price, "Insufficient payment");

        delete listings[nft][tokenId];

        uint256 fee = (l.price * FEE_BPS) / BPS_DENOMINATOR;
        uint256 toSeller = l.price - fee;

        // All fee goes to revenue (no reward pool in controlled economy)
        (bool sentRev, ) = revenueRecipient.call{value: fee}("");
        require(sentRev, "Revenue transfer failed");

        // send to seller
        (bool sentSeller, ) = l.seller.call{value: toSeller}("");
        require(sentSeller, "Payout failed");

        // refund dust
        if (msg.value > l.price) {
            (bool refundOk, ) = msg.sender.call{value: msg.value - l.price}("");
            require(refundOk, "Refund failed");
        }

        // transfer NFT
        IERC721(nft).safeTransferFrom(l.seller, msg.sender, tokenId);

        emit Purchased(nft, tokenId, msg.sender, l.seller, l.price, fee);
    }

    // -------------------------------------------------------------------------
    // ERC721 Receiver
    // -------------------------------------------------------------------------

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        // We don't custody NFTs; listing keeps them in owner wallet.
        return IERC721Receiver.onERC721Received.selector;
    }
}
