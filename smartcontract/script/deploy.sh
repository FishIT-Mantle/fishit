#!/bin/bash

# FishIt Smart Contract Deployment Script
# This script deploys all FishIt contracts to the configured network

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

# Optional: Check if admin and revenue recipient are set, otherwise use deployer
if [ -z "$ADMIN_ADDRESS" ] || [ "$ADMIN_ADDRESS" = "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${YELLOW}Warning: ADMIN_ADDRESS not set, will use deployer address${NC}"
    ADMIN_ADDRESS=""
fi

if [ -z "$REVENUE_RECIPIENT_ADDRESS" ] || [ "$REVENUE_RECIPIENT_ADDRESS" = "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${YELLOW}Warning: REVENUE_RECIPIENT_ADDRESS not set, will use deployer address${NC}"
    REVENUE_RECIPIENT_ADDRESS=""
fi

# Check if Supra VRF Router is configured
if [ -z "$SUPRA_ROUTER_ADDRESS" ] || [ "$SUPRA_ROUTER_ADDRESS" = "0x0000000000000000000000000000000000000000" ]; then
    echo -e "${YELLOW}Warning: SUPRA_ROUTER_ADDRESS not configured${NC}"
    echo "VRF will not be configured during deployment. You need to set it manually later."
    SUPRA_ROUTER_ADDRESS="0x0000000000000000000000000000000000000000"
fi

# Default Supra confirmations if not set
if [ -z "$SUPRA_NUM_CONFIRMATIONS" ]; then
    SUPRA_NUM_CONFIRMATIONS=3
fi

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo -e "${RED}Error: forge command not found${NC}"
    echo "Please install Foundry: https://getfoundry.sh/"
    exit 1
fi

# Build contracts first
echo -e "${BLUE}Building contracts...${NC}"
forge build --force

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Display deployment configuration
echo -e "${BLUE}=== Deployment Configuration ===${NC}"
echo "Network: $RPC_URL"
echo "Chain ID: ${CHAIN_ID:-N/A}"
if [ -n "$ADMIN_ADDRESS" ]; then
    echo "Admin: $ADMIN_ADDRESS"
else
    echo "Admin: Will use deployer address"
fi
if [ -n "$REVENUE_RECIPIENT_ADDRESS" ]; then
    echo "Revenue Recipient: $REVENUE_RECIPIENT_ADDRESS"
else
    echo "Revenue Recipient: Will use deployer address"
fi
if [ "$SUPRA_ROUTER_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo "Supra VRF Router: $SUPRA_ROUTER_ADDRESS"
    echo "Supra Confirmations: $SUPRA_NUM_CONFIRMATIONS"
else
    echo "Supra VRF Router: Not configured (will skip VRF setup)"
fi
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""

# Deployment command
DEPLOY_CMD="forge script script/DeployFishIt.s.sol:DeployFishIt --rpc-url $RPC_URL --broadcast -vvv"

# Add verify flag if ETHERSCAN_API_KEY is set
if [ -n "$ETHERSCAN_API_KEY" ]; then
    echo -e "${BLUE}Contract verification enabled${NC}"
    DEPLOY_CMD="$DEPLOY_CMD --verify"
else
    echo -e "${YELLOW}Contract verification disabled (ETHERSCAN_API_KEY not set)${NC}"
fi

echo -e "${BLUE}Starting deployment...${NC}"
echo ""

# Run deployment
$DEPLOY_CMD

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}Deployment failed!${NC}"
    exit $DEPLOY_EXIT_CODE
fi

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""

# Extract contract addresses from broadcast logs
BROADCAST_DIR="broadcast/DeployFishIt.s.sol"
LATEST_RUN=$(ls -t "$BROADCAST_DIR" 2>/dev/null | head -n 1)
RUN_FULL_PATH="$BROADCAST_DIR/$LATEST_RUN/run-latest.json"

if [ -f "$RUN_FULL_PATH" ]; then
    echo -e "${BLUE}Extracting contract addresses...${NC}"
    
    # Extract addresses using jq if available, otherwise use grep/sed
    if command -v jq &> /dev/null; then
        echo ""
        echo -e "${GREEN}Deployed Contract Addresses:${NC}"
        
        # Note: Foundry broadcast format may vary, adjust extraction as needed
        # For now, we'll parse the console logs from the script output
        
        echo "Please check the deployment output above for contract addresses."
        echo ""
        echo "You can also check the broadcast logs:"
        echo "  $RUN_FULL_PATH"
        echo ""
        echo "To extract addresses, run:"
        echo "  cat $RUN_FULL_PATH | jq '.transactions[] | select(.contractName != null) | {name: .contractName, address: .contractAddress}'"
    else
        echo "Install 'jq' for better address extraction:"
        echo "  sudo apt-get install jq  # Ubuntu/Debian"
        echo "  brew install jq           # macOS"
    fi
else
    echo -e "${YELLOW}Warning: Could not find broadcast logs${NC}"
    echo "Contract addresses should be displayed in the deployment output above."
fi

echo ""
echo -e "${BLUE}=== Next Steps ===${NC}"
echo "1. Update .env file with deployed contract addresses:"
echo "   - STAKING_ADDRESS"
echo "   - NFT_ADDRESS"
echo "   - ZONE_VALIDATOR_ADDRESS"
echo "   - FISH_BAIT_ADDRESS"
echo "   - GAME_ADDRESS"
echo "   - FISH_UPGRADE_ADDRESS"
echo "   - MARKETPLACE_ADDRESS"
echo ""
echo "2. If Supra VRF Router was not configured, set it manually:"
echo "   forge script script/SetVRFConfig.s.sol:SetVRFConfig --rpc-url \$RPC_URL --broadcast"
echo ""
echo "3. Test the deployment:"
echo "   ./script/test-interactions.sh"
echo ""
echo "4. Transfer admin roles to multisig (production only):"
echo "   Use setAdmin() function on each contract"
echo ""
echo -e "${GREEN}Deployment script completed!${NC}"
