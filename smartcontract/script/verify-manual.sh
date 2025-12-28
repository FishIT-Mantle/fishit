#!/bin/bash

# Manual verification helper for FishIt smart contracts
# Generate links and instructions for manual verification on Blockscout

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

source .env

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Manual Contract Verification Links ===${NC}"
echo ""
echo "Blockscout API is currently unavailable (503 error)."
echo "Use these links to verify contracts manually through the web interface:"
echo ""

if [ -n "$STAKING_ADDRESS" ] && [ "$STAKING_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${GREEN}FishItStaking:${NC}"
    echo "  https://explorer.sepolia.mantle.xyz/address/$STAKING_ADDRESS"
    echo "  Constructor: address(admin) = $ADMIN_ADDRESS"
    echo ""
fi

if [ -n "$NFT_ADDRESS" ] && [ "$NFT_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${GREEN}FishNFT:${NC}"
    echo "  https://explorer.sepolia.mantle.xyz/address/$NFT_ADDRESS"
    echo "  Constructor: address(owner) = $ADMIN_ADDRESS"
    echo ""
fi

if [ -n "$ZONE_VALIDATOR_ADDRESS" ] && [ "$ZONE_VALIDATOR_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${GREEN}ZoneValidator:${NC}"
    echo "  https://explorer.sepolia.mantle.xyz/address/$ZONE_VALIDATOR_ADDRESS"
    echo "  Constructor: address(admin), address(staking), address(nft)"
    echo "  Args: $ADMIN_ADDRESS, $STAKING_ADDRESS, $NFT_ADDRESS"
    echo ""
fi

if [ -n "$FISH_BAIT_ADDRESS" ] && [ "$FISH_BAIT_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${GREEN}FishBait:${NC}"
    echo "  https://explorer.sepolia.mantle.xyz/address/$FISH_BAIT_ADDRESS"
    echo "  Constructor: address(admin) = $ADMIN_ADDRESS"
    echo ""
fi

if [ -n "$GAME_ADDRESS" ] && [ "$GAME_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${GREEN}FishingGame:${NC}"
    echo "  https://explorer.sepolia.mantle.xyz/address/$GAME_ADDRESS"
    echo "  Constructor: address(admin), address(staking), address(nft), address(validator), address(bait), address(revenue)"
    echo "  Args: $ADMIN_ADDRESS, $STAKING_ADDRESS, $NFT_ADDRESS, $ZONE_VALIDATOR_ADDRESS, $FISH_BAIT_ADDRESS, ${REVENUE_RECIPIENT_ADDRESS:-$ADMIN_ADDRESS}"
    echo ""
fi

if [ -n "$FISH_UPGRADE_ADDRESS" ] && [ "$FISH_UPGRADE_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${GREEN}FishUpgrade:${NC}"
    echo "  https://explorer.sepolia.mantle.xyz/address/$FISH_UPGRADE_ADDRESS"
    echo "  Constructor: address(admin), address(nft)"
    echo "  Args: $ADMIN_ADDRESS, $NFT_ADDRESS"
    echo ""
fi

if [ -n "$MARKETPLACE_ADDRESS" ] && [ "$MARKETPLACE_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${GREEN}FishMarketplace:${NC}"
    echo "  https://explorer.sepolia.mantle.xyz/address/$MARKETPLACE_ADDRESS"
    echo "  Constructor: address(admin), address(revenue)"
    echo "  Args: $ADMIN_ADDRESS, ${REVENUE_RECIPIENT_ADDRESS:-$ADMIN_ADDRESS}"
    echo ""
fi

echo -e "${YELLOW}Manual Verification Steps:${NC}"
echo "1. Click on one of the links above"
echo "2. On the contract page, click 'Verify and Publish' button"
echo "3. Choose 'Via Standard JSON Input' or 'Via Flat File'"
echo "4. Fill in the details:"
echo "   - Contract Name: e.g., FishItStaking"
echo "   - Compiler: Check 'forge build' output or foundry.toml"
echo "   - Optimization: Yes, 200 runs"
echo "   - Constructor Arguments: Copy from above"
echo "   - Contract Source Code: Paste from src/ContractName.sol"
echo "5. Click 'Verify and Publish'"
echo ""

echo -e "${BLUE}Compiler Information:${NC}"
echo "Solidity Version: Check in contracts (pragma solidity ^0.8.20;)"
echo "Optimizer: Enabled, 200 runs"
echo "EVM Version: Default (London or compatible)"
echo ""

echo -e "${YELLOW}Note:${NC} Blockscout API is currently experiencing issues."
echo "Manual verification through web interface is the recommended approach."
echo ""
echo "Try running './script/verify.sh' again later when API is back online."