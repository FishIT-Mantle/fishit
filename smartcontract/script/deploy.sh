#!/bin/bash

# FishIt Smart Contract Deployment Script
# This script deploys all FishIt contracts to the configured network (Mantle Network)

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

# Remove quotes and 0x prefix from PRIVATE_KEY if present (Foundry expects raw hex without 0x)
PRIVATE_KEY=$(echo "$PRIVATE_KEY" | sed "s/^[\"']//; s/[\"']$//; s/^0x//")

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

# Validate RPC URL before deployment
echo -e "${BLUE}Validating RPC connection...${NC}"
if command -v cast &> /dev/null; then
    RPC_CHAIN_ID=$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$RPC_CHAIN_ID" ]; then
        echo -e "${GREEN}✓ RPC connection successful (Chain ID: $RPC_CHAIN_ID)${NC}"
        # Update CHAIN_ID if not set or different
        if [ -z "$CHAIN_ID" ]; then
            CHAIN_ID=$RPC_CHAIN_ID
        elif [ "$CHAIN_ID" != "$RPC_CHAIN_ID" ]; then
            echo -e "${YELLOW}Warning: CHAIN_ID in .env ($CHAIN_ID) differs from RPC chain ID ($RPC_CHAIN_ID)${NC}"
        fi
    else
        echo -e "${RED}Error: Failed to connect to RPC endpoint${NC}"
        echo -e "${RED}RPC URL: $RPC_URL${NC}"
        echo ""
        echo -e "${YELLOW}Common Mantle Network RPC URLs:${NC}"
        echo "  Testnet: https://rpc.sepolia.mantle.xyz (Chain ID: 5003)"
        echo "  Mainnet: https://rpc.mantle.xyz (Chain ID: 5000)"
        echo ""
        echo "Please check your RPC_URL in .env file and try again."
        exit 1
    fi
else
    echo -e "${YELLOW}Warning: cast not found, skipping RPC validation${NC}"
fi
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

# Deployment command - save output to temporary file for parsing
TEMP_OUTPUT=$(mktemp)

# Build forge script command with private key
# PRIVATE_KEY already cleaned (quotes and 0x prefix removed) above
DEPLOY_CMD_BASE="forge script script/DeployFishIt.s.sol:DeployFishIt --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY -vvv"

# Determine if we should try verification
VERIFY_ENABLED=false
if [ -n "$ETHERSCAN_API_KEY" ]; then
    VERIFY_ENABLED=true
    echo -e "${BLUE}Contract verification enabled${NC}"
else
    echo -e "${YELLOW}Contract verification disabled (ETHERSCAN_API_KEY not set)${NC}"
fi

echo -e "${BLUE}Starting deployment...${NC}"
echo ""

# Try deployment with verification first (if enabled), then without if it fails
DEPLOY_SUCCESS=false
if [ "$VERIFY_ENABLED" = true ]; then
    DEPLOY_CMD="${DEPLOY_CMD_BASE} --verify"
    echo -e "${BLUE}Attempting deployment with contract verification...${NC}"
    $DEPLOY_CMD 2>&1 | tee "$TEMP_OUTPUT"
    DEPLOY_EXIT_CODE=${PIPESTATUS[0]}
    
    # Check if error is related to verification (400 Bad Request)
    if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
        if grep -q "HTTP error 400\|Bad Request\|verification" "$TEMP_OUTPUT"; then
            echo ""
            echo -e "${YELLOW}Warning: Verification failed with error 400${NC}"
            echo -e "${YELLOW}Retrying deployment without verification...${NC}"
            echo ""
            
            # Retry without verification
            DEPLOY_CMD="$DEPLOY_CMD_BASE"
            $DEPLOY_CMD 2>&1 | tee "$TEMP_OUTPUT"
            DEPLOY_EXIT_CODE=${PIPESTATUS[0]}
            
            if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
                DEPLOY_SUCCESS=true
                echo ""
                echo -e "${YELLOW}Deployment succeeded without verification${NC}"
                echo -e "${YELLOW}You can verify contracts manually later using:${NC}"
                echo "  forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_PATH>:<CONTRACT_NAME> --chain-id ${CHAIN_ID:-5001} --etherscan-api-key \$ETHERSCAN_API_KEY --rpc-url $RPC_URL"
            fi
        fi
    else
        DEPLOY_SUCCESS=true
    fi
else
    DEPLOY_CMD="$DEPLOY_CMD_BASE"
    $DEPLOY_CMD 2>&1 | tee "$TEMP_OUTPUT"
    DEPLOY_EXIT_CODE=${PIPESTATUS[0]}
    if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
        DEPLOY_SUCCESS=true
    fi
fi

if [ "$DEPLOY_SUCCESS" = false ]; then
    echo ""
    echo -e "${RED}Deployment failed!${NC}"
    echo -e "${RED}Error details:${NC}"
    echo ""
    # Show last few lines of error
    tail -20 "$TEMP_OUTPUT" | grep -i "error\|failed\|revert" || tail -20 "$TEMP_OUTPUT"
    rm -f "$TEMP_OUTPUT"
    exit $DEPLOY_EXIT_CODE
fi

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""

# Extract contract addresses from console output
echo -e "${BLUE}Extracting contract addresses...${NC}"

# Extract addresses from console logs (format: "ContractName deployed at: 0x..." or "ContractName: 0x...")
declare -A CONTRACT_ADDRESSES

while IFS= read -r line; do
    # Match format: "   FishItStaking deployed at: 0x..."
    if [[ $line =~ deployed\ at:\ (0x[a-fA-F0-9]{40}) ]]; then
        CONTRACT_NAME=$(echo "$line" | grep -oP '^[[:space:]]*\K[^[:space:]]+(?= deployed at)')
        ADDRESS="${BASH_REMATCH[1]}"
        # Clean up contract name (remove leading spaces)
        CONTRACT_NAME=$(echo "$CONTRACT_NAME" | xargs)
        CONTRACT_ADDRESSES["$CONTRACT_NAME"]="$ADDRESS"
    # Match format: "FishItStaking: 0x..." (from summary)
    elif [[ $line =~ ^([A-Za-z0-9]+):[[:space:]]+(0x[a-fA-F0-9]{40})$ ]]; then
        CONTRACT_NAME="${BASH_REMATCH[1]}"
        ADDRESS="${BASH_REMATCH[2]}"
        # Only update if not already set (prefer "deployed at" format)
        if [ -z "${CONTRACT_ADDRESSES[$CONTRACT_NAME]}" ]; then
            CONTRACT_ADDRESSES["$CONTRACT_NAME"]="$ADDRESS"
        fi
    fi
done < "$TEMP_OUTPUT"

# Map contract names to env variable names
declare -A CONTRACT_MAP=(
    ["FishItStaking"]="STAKING_ADDRESS"
    ["FishNFT"]="NFT_ADDRESS"
    ["ZoneValidator"]="ZONE_VALIDATOR_ADDRESS"
    ["FishBait"]="FISH_BAIT_ADDRESS"
    ["FishingGame"]="GAME_ADDRESS"
    ["FishUpgrade"]="FISH_UPGRADE_ADDRESS"
    ["FishMarketplace"]="MARKETPLACE_ADDRESS"
)

# Determine explorer URL based on chain ID
EXPLORER_URL=""
if [ "$CHAIN_ID" = "5003" ] || [ "$CHAIN_ID" = "5001" ]; then
    EXPLORER_URL="https://explorer.sepolia.mantle.xyz"
elif [ "$CHAIN_ID" = "5000" ]; then
    EXPLORER_URL="https://explorer.mantle.xyz"
else
    EXPLORER_URL="https://explorer.sepolia.mantle.xyz" # Default to testnet
fi

# Display extracted addresses with explorer links
echo ""
echo -e "${GREEN}Deployed Contract Addresses:${NC}"
for contract in "${!CONTRACT_ADDRESSES[@]}"; do
    address="${CONTRACT_ADDRESSES[$contract]}"
    echo "  $contract: $address"
    echo -e "    ${BLUE}Explorer:${NC} $EXPLORER_URL/address/$address"
done

# Ask if user wants to save to .env
echo ""
read -p "Save contract addresses to .env file? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ENV_FILE="$PROJECT_DIR/.env"
    BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Create backup
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo -e "${BLUE}Backup created: $BACKUP_FILE${NC}"
    
    # Update .env file with contract addresses
    for contract in "${!CONTRACT_ADDRESSES[@]}"; do
        if [ -n "${CONTRACT_MAP[$contract]}" ]; then
            env_var="${CONTRACT_MAP[$contract]}"
            address="${CONTRACT_ADDRESSES[$contract]}"
            
            # Use sed to update or append the variable
            if grep -q "^${env_var}=" "$ENV_FILE"; then
                # Update existing
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|^${env_var}=.*|${env_var}=${address}|" "$ENV_FILE"
                else
                    sed -i "s|^${env_var}=.*|${env_var}=${address}|" "$ENV_FILE"
                fi
            else
                # Append new
                echo "${env_var}=${address}" >> "$ENV_FILE"
            fi
            echo -e "${GREEN}✓ Updated ${env_var}${NC}"
        fi
    done
    echo -e "${GREEN}Contract addresses saved to .env file${NC}"
fi

# Clean up
rm -f "$TEMP_OUTPUT"

echo ""
echo -e "${BLUE}=== Next Steps ===${NC}"
echo "1. Verify contract addresses in .env file (if saved)"
echo "2. Verify contracts on explorer:"
echo -e "   ${BLUE}./script/verify.sh${NC}"
echo "3. If Supra VRF Router was not configured, set it manually"
echo "4. Test the deployment: ./script/test-interactions.sh"
echo "5. Transfer admin roles to multisig (production only)"
echo ""
echo -e "${GREEN}Deployment script completed!${NC}"
