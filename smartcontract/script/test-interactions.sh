#!/bin/bash

# FishIt Smart Contract Test Interactions Script
# This script tests interactions with deployed contracts

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_DIR"

# Load environment variables
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and fill in the values:"
    echo "  cp .env.example .env"
    exit 1
fi

source .env

# Validate required environment variables
if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "your_deployer_private_key_here_without_0x_prefix" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env file${NC}"
    exit 1
fi

if [ -z "$RPC_URL" ]; then
    echo -e "${RED}Error: RPC_URL not set in .env file${NC}"
    exit 1
fi

# Check if contract addresses are set
REQUIRED_ADDRESSES=("STAKING_ADDRESS" "NFT_ADDRESS" "GAME_ADDRESS" "MARKETPLACE_ADDRESS")
MISSING_ADDRESSES=()

for addr_var in "${REQUIRED_ADDRESSES[@]}"; do
    if [ -z "${!addr_var}" ]; then
        MISSING_ADDRESSES+=("$addr_var")
    fi
done

if [ ${#MISSING_ADDRESSES[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required contract addresses in .env file:${NC}"
    for addr_var in "${MISSING_ADDRESSES[@]}"; do
        echo "  - $addr_var"
    done
    echo ""
    echo "Please update .env file with deployed contract addresses."
    exit 1
fi

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo -e "${RED}Error: forge command not found${NC}"
    echo "Please install Foundry: https://getfoundry.sh/"
    exit 1
fi

# Display test configuration
echo -e "${BLUE}=== Test Configuration ===${NC}"
echo "Network: $RPC_URL"
echo "Staking: $STAKING_ADDRESS"
echo "NFT: $NFT_ADDRESS"
echo "Game: $GAME_ADDRESS"
echo "Marketplace: $MARKETPLACE_ADDRESS"
if [ -n "$ZONE_VALIDATOR_ADDRESS" ]; then
    echo "Zone Validator: $ZONE_VALIDATOR_ADDRESS"
fi
if [ -n "$FISH_BAIT_ADDRESS" ]; then
    echo "Fish Bait: $FISH_BAIT_ADDRESS"
fi
if [ -n "$FISH_UPGRADE_ADDRESS" ]; then
    echo "Fish Upgrade: $FISH_UPGRADE_ADDRESS"
fi
echo ""

# Confirm test execution
read -p "Continue with test interactions? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled."
    exit 0
fi

echo ""

# Run test interactions script
echo -e "${BLUE}Running test interactions...${NC}"
echo ""

forge script script/TestInteractions.s.sol:TestInteractions \
    --rpc-url "$RPC_URL" \
    --broadcast \
    -vvv

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}Test interactions failed!${NC}"
    exit $TEST_EXIT_CODE
fi

echo ""
echo -e "${GREEN}Test interactions completed successfully!${NC}"
