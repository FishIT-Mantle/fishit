#!/bin/bash

# FishIt Smart Contract Environment Setup Script
# This script helps set up the .env file from .env.example

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

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

echo -e "${BLUE}=== FishIt Environment Setup ===${NC}"
echo ""

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Warning: .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Existing .env file preserved."
        exit 0
    fi
    echo ""
fi

# Check if .env.example exists
if [ ! -f "$ENV_EXAMPLE" ]; then
    echo -e "${RED}Error: .env.example file not found!${NC}"
    exit 1
fi

# Copy .env.example to .env
echo -e "${BLUE}Copying .env.example to .env...${NC}"
cp "$ENV_EXAMPLE" "$ENV_FILE"
echo -e "${GREEN}✓ Created .env file${NC}"
echo ""

# Interactive setup for required variables
echo -e "${BLUE}Please fill in the required values:${NC}"
echo ""

# Private Key
read -p "Enter deployer private key (without 0x prefix): " PRIVATE_KEY
if [ -n "$PRIVATE_KEY" ]; then
    # Use sed to replace the value (works on both macOS and Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|PRIVATE_KEY=.*|PRIVATE_KEY=$PRIVATE_KEY|" "$ENV_FILE"
    else
        sed -i "s|PRIVATE_KEY=.*|PRIVATE_KEY=$PRIVATE_KEY|" "$ENV_FILE"
    fi
fi
echo ""

# RPC URL
echo "Select network:"
echo "  1) Mantle Testnet (default)"
echo "  2) Mantle Mainnet"
echo "  3) Local (http://127.0.0.1:8545)"
echo "  4) Custom"
read -p "Enter choice [1-4] (default: 1): " NETWORK_CHOICE
NETWORK_CHOICE=${NETWORK_CHOICE:-1}

case $NETWORK_CHOICE in
    1)
        RPC_URL="https://rpc.testnet.mantle.xyz"
        CHAIN_ID="5001"
        ;;
    2)
        RPC_URL="https://rpc.mantle.xyz"
        CHAIN_ID="5000"
        ;;
    3)
        RPC_URL="http://127.0.0.1:8545"
        CHAIN_ID="31337"
        ;;
    4)
        read -p "Enter custom RPC URL: " RPC_URL
        read -p "Enter Chain ID: " CHAIN_ID
        ;;
    *)
        RPC_URL="https://rpc.testnet.mantle.xyz"
        CHAIN_ID="5001"
        ;;
esac

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|RPC_URL=.*|RPC_URL=$RPC_URL|" "$ENV_FILE"
    sed -i '' "s|CHAIN_ID=.*|CHAIN_ID=$CHAIN_ID|" "$ENV_FILE"
else
    sed -i "s|RPC_URL=.*|RPC_URL=$RPC_URL|" "$ENV_FILE"
    sed -i "s|CHAIN_ID=.*|CHAIN_ID=$CHAIN_ID|" "$ENV_FILE"
fi

echo ""

# Admin Address (optional)
read -p "Enter admin address (optional, press Enter to use deployer): " ADMIN_ADDRESS
if [ -n "$ADMIN_ADDRESS" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|ADMIN_ADDRESS=.*|ADMIN_ADDRESS=$ADMIN_ADDRESS|" "$ENV_FILE"
    else
        sed -i "s|ADMIN_ADDRESS=.*|ADMIN_ADDRESS=$ADMIN_ADDRESS|" "$ENV_FILE"
    fi
fi
echo ""

# Revenue Recipient (optional)
read -p "Enter revenue recipient address (optional, press Enter to use deployer): " REVENUE_RECIPIENT
if [ -n "$REVENUE_RECIPIENT" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|REVENUE_RECIPIENT_ADDRESS=.*|REVENUE_RECIPIENT_ADDRESS=$REVENUE_RECIPIENT|" "$ENV_FILE"
    else
        sed -i "s|REVENUE_RECIPIENT_ADDRESS=.*|REVENUE_RECIPIENT_ADDRESS=$REVENUE_RECIPIENT|" "$ENV_FILE"
    fi
fi
echo ""

# Supra VRF Router (optional)
read -p "Enter Supra VRF Router address (optional, can be set later): " SUPRA_ROUTER
if [ -n "$SUPRA_ROUTER" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|SUPRA_ROUTER_ADDRESS=.*|SUPRA_ROUTER_ADDRESS=$SUPRA_ROUTER|" "$ENV_FILE"
    else
        sed -i "s|SUPRA_ROUTER_ADDRESS=.*|SUPRA_ROUTER_ADDRESS=$SUPRA_ROUTER|" "$ENV_FILE"
    fi
else
    echo -e "${YELLOW}Note: Supra VRF Router can be configured later${NC}"
fi
echo ""

# Etherscan API Key (optional)
read -p "Enter Etherscan/Mantle Explorer API key (optional, for contract verification): " ETHERSCAN_KEY
if [ -n "$ETHERSCAN_KEY" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|ETHERSCAN_API_KEY=.*|ETHERSCAN_API_KEY=$ETHERSCAN_KEY|" "$ENV_FILE"
    else
        sed -i "s|ETHERSCAN_API_KEY=.*|ETHERSCAN_API_KEY=$ETHERSCAN_KEY|" "$ENV_FILE"
    fi
fi
echo ""

echo -e "${GREEN}=== Environment Setup Complete ===${NC}"
echo ""
echo "Your .env file has been created with the following configuration:"
echo "  Network: $RPC_URL"
echo "  Chain ID: $CHAIN_ID"
echo ""
echo "Next steps:"
echo "  1. Review and edit .env file if needed"
echo "  2. Run deployment: ./script/deploy.sh"
echo "  3. Or run tests: forge test"
echo ""
