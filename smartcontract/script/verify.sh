#!/bin/bash

# Script untuk verify smart contracts yang sudah di-deploy di Mantle Network
# Menggunakan Blockscout verifier

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Load environment variables
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file or run setup-env.sh first"
    exit 1
fi

source .env

# Check required variables
if [ -z "$RPC_URL" ]; then
    echo -e "${RED}Error: RPC_URL not set in .env${NC}"
    exit 1
fi

if [ -z "$CHAIN_ID" ]; then
    echo -e "${YELLOW}Warning: CHAIN_ID not set, defaulting to 5003 (Mantle Sepolia)${NC}"
    CHAIN_ID=5003
fi

# Determine Blockscout API URL based on chain ID
if [ "$CHAIN_ID" = "5003" ]; then
    VERIFIER_URL="https://explorer.sepolia.mantle.xyz/api"
    EXPLORER_URL="https://explorer.sepolia.mantle.xyz"
elif [ "$CHAIN_ID" = "5000" ]; then
    VERIFIER_URL="https://explorer.mantle.xyz/api"
    EXPLORER_URL="https://explorer.mantle.xyz"
else
    echo -e "${YELLOW}Warning: Unknown chain ID, defaulting to Mantle Sepolia${NC}"
    VERIFIER_URL="https://explorer.sepolia.mantle.xyz/api"
    EXPLORER_URL="https://explorer.sepolia.mantle.xyz"
    CHAIN_ID=5003
fi

echo -e "${BLUE}=== FishIt Contract Verification ===${NC}"
echo "Network: $RPC_URL"
echo "Chain ID: $CHAIN_ID"
echo "Verifier URL: $VERIFIER_URL"
echo "Explorer: $EXPLORER_URL"
echo ""

# Check if cast is available
if ! command -v cast &> /dev/null; then
    echo -e "${RED}Error: cast command not found${NC}"
    echo "Please install Foundry: https://getfoundry.sh/"
    exit 1
fi

# Get compiler settings from foundry.toml or use defaults
OPTIMIZER_RUNS=200  # Default, adjust if your foundry.toml has different setting
if grep -q "optimizer_runs" foundry.toml 2>/dev/null; then
    OPTIMIZER_RUNS=$(grep -oP 'optimizer_runs\s*=\s*\K\d+' foundry.toml || echo "200")
fi

echo -e "${BLUE}Compiler settings:${NC}"
echo "  Optimizer runs: $OPTIMIZER_RUNS"
echo ""

# Function to verify a contract with retry logic
verify_contract() {
    local contract_name=$1
    local contract_path=$2
    local contract_address=$3
    local constructor_args=$4
    
    if [ -z "$contract_address" ] || [ "$contract_address" = "0x0000000000000000000000000000000000000000" ]; then
        echo -e "${YELLOW}⚠ Skipping $contract_name: address not found in .env${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Verifying $contract_name...${NC}"
    echo "  Address: $contract_address"
    echo "  Path: $contract_path"
    
    local verify_cmd="forge verify-contract \
        --chain-id $CHAIN_ID \
        --num-of-optimizations $OPTIMIZER_RUNS \
        --watch \
        --verifier blockscout \
        --verifier-url $VERIFIER_URL \
        --rpc-url $RPC_URL"
    
    # Add constructor args if provided
    if [ -n "$constructor_args" ]; then
        verify_cmd="$verify_cmd --constructor-args $constructor_args"
    fi
    
    verify_cmd="$verify_cmd $contract_address $contract_path"
    
    echo -e "${BLUE}Running:${NC} $verify_cmd"
    echo ""
    
    # Retry logic for API errors (503, 502, etc.)
    local max_retries=3
    local retry_delay=5
    local attempt=1
    
    while [ $attempt -le $max_retries ]; do
        if [ $attempt -gt 1 ]; then
            echo -e "${YELLOW}Retry attempt $attempt of $max_retries (waiting ${retry_delay}s)...${NC}"
            sleep $retry_delay
            retry_delay=$((retry_delay * 2)) # Exponential backoff
        fi
        
        # Run verification command and capture output
        local temp_file=$(mktemp)
        local verify_output=""
        
        if eval "$verify_cmd" > "$temp_file" 2>&1; then
            verify_output=$(cat "$temp_file")
            cat "$temp_file"
            rm -f "$temp_file"
            echo -e "${GREEN}✓ $contract_name verified successfully${NC}"
            echo -e "  ${BLUE}Explorer:${NC} $EXPLORER_URL/address/$contract_address"
            echo ""
            return 0
        else
            local exit_code=$?
            verify_output=$(cat "$temp_file")
            cat "$temp_file"
            rm -f "$temp_file"
            
            # Check if error is retryable (503, 502, 504, connection errors)
            if echo "$verify_output" | grep -qiE "503|502|504|Service Temporarily Unavailable|Failed to obtain|connection|timeout|temporarily unavailable"; then
                if [ $attempt -lt $max_retries ]; then
                    echo ""
                    echo -e "${YELLOW}⚠ API error detected (503/502/504), retrying in ${retry_delay}s...${NC}"
                    echo ""
                    ((attempt++))
                    continue
                else
                    echo ""
                    echo -e "${RED}✗ Failed to verify $contract_name after $max_retries attempts${NC}"
                    echo -e "${YELLOW}The Blockscout API is temporarily unavailable.${NC}"
                    echo ""
                    echo -e "${BLUE}Alternative: Verify manually via web interface${NC}"
                    echo -e "  1. Open: ${BLUE}$EXPLORER_URL/address/$contract_address${NC}"
                    echo -e "  2. Click 'Verify and Publish' button"
                    echo -e "  3. Follow the verification wizard"
                    echo ""
                    return 1
                fi
            else
                # Non-retryable error (e.g., wrong constructor args, already verified, etc.)
                echo ""
                echo -e "${RED}✗ Failed to verify $contract_name${NC}"
                if echo "$verify_output" | grep -qiE "already verified|already been verified"; then
                    echo -e "${YELLOW}Contract may already be verified. Check explorer:${NC}"
                    echo -e "  ${BLUE}$EXPLORER_URL/address/$contract_address${NC}"
                fi
                echo ""
                return 1
            fi
        fi
    done
}

# Check if private key is available for encoding constructor args
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${YELLOW}Warning: PRIVATE_KEY not set. Cannot encode constructor arguments automatically.${NC}"
    echo -e "${YELLOW}Please encode constructor args manually or set PRIVATE_KEY in .env${NC}"
    echo ""
fi

# Verify contracts in deployment order
VERIFY_COUNT=0
SUCCESS_COUNT=0

# 1. FishItStaking - constructor(address _admin)
if [ -n "$STAKING_ADDRESS" ]; then
    if [ -n "$PRIVATE_KEY" ] && [ -n "$ADMIN_ADDRESS" ] && [ "$ADMIN_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
        ADMIN_ARG=$(cast abi-encode "constructor(address)" "$ADMIN_ADDRESS")
        if verify_contract "FishItStaking" "src/FishItStaking.sol:FishItStaking" "$STAKING_ADDRESS" "$ADMIN_ARG"; then
            ((SUCCESS_COUNT++))
        fi
    else
        # Try to get admin from contract
        ADMIN_FROM_CONTRACT=$(cast call "$STAKING_ADDRESS" "admin()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
        if [ -n "$ADMIN_FROM_CONTRACT" ]; then
            ADMIN_ARG=$(cast abi-encode "constructor(address)" "$ADMIN_FROM_CONTRACT")
            if verify_contract "FishItStaking" "src/FishItStaking.sol:FishItStaking" "$STAKING_ADDRESS" "$ADMIN_ARG"; then
                ((SUCCESS_COUNT++))
            fi
        else
            echo -e "${YELLOW}⚠ Cannot determine admin address for FishItStaking${NC}"
            echo -e "${YELLOW}  Please verify manually:${NC}"
            echo "  forge verify-contract --chain-id $CHAIN_ID --num-of-optimizations $OPTIMIZER_RUNS --watch --verifier blockscout --verifier-url $VERIFIER_URL --rpc-url $RPC_URL --constructor-args \$(cast abi-encode 'constructor(address)' <ADMIN_ADDRESS>) $STAKING_ADDRESS src/FishItStaking.sol:FishItStaking"
            echo ""
        fi
    fi
    ((VERIFY_COUNT++))
fi

# 2. FishNFT - constructor(address _owner)
if [ -n "$NFT_ADDRESS" ]; then
    if [ -n "$PRIVATE_KEY" ] && [ -n "$ADMIN_ADDRESS" ] && [ "$ADMIN_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
        OWNER_ARG=$(cast abi-encode "constructor(address)" "$ADMIN_ADDRESS")
        if verify_contract "FishNFT" "src/FishNFT.sol:FishNFT" "$NFT_ADDRESS" "$OWNER_ARG"; then
            ((SUCCESS_COUNT++))
        fi
    else
        OWNER_FROM_CONTRACT=$(cast call "$NFT_ADDRESS" "owner()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
        if [ -n "$OWNER_FROM_CONTRACT" ]; then
            OWNER_ARG=$(cast abi-encode "constructor(address)" "$OWNER_FROM_CONTRACT")
            if verify_contract "FishNFT" "src/FishNFT.sol:FishNFT" "$NFT_ADDRESS" "$OWNER_ARG"; then
                ((SUCCESS_COUNT++))
            fi
        else
            echo -e "${YELLOW}⚠ Cannot determine owner address for FishNFT${NC}"
        fi
    fi
    ((VERIFY_COUNT++))
fi

# 3. ZoneValidator - constructor(address _admin, FishItStaking _staking, FishNFT _fishNFT)
if [ -n "$ZONE_VALIDATOR_ADDRESS" ] && [ -n "$STAKING_ADDRESS" ] && [ -n "$NFT_ADDRESS" ]; then
    ADMIN_FROM_CONTRACT=$(cast call "$ZONE_VALIDATOR_ADDRESS" "admin()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "$ADMIN_ADDRESS")
    if [ -z "$ADMIN_FROM_CONTRACT" ] || [ "$ADMIN_FROM_CONTRACT" = "0x0000000000000000000000000000000000000000" ]; then
        ADMIN_FROM_CONTRACT="$ADMIN_ADDRESS"
    fi
    CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address,address)" "$ADMIN_FROM_CONTRACT" "$STAKING_ADDRESS" "$NFT_ADDRESS" 2>/dev/null)
    if verify_contract "ZoneValidator" "src/ZoneValidator.sol:ZoneValidator" "$ZONE_VALIDATOR_ADDRESS" "$CONSTRUCTOR_ARGS"; then
        ((SUCCESS_COUNT++))
    fi
    ((VERIFY_COUNT++))
fi

# 4. FishBait - constructor(address _admin)
if [ -n "$FISH_BAIT_ADDRESS" ]; then
    ADMIN_ARG=$(cast abi-encode "constructor(address)" "$ADMIN_ADDRESS" 2>/dev/null || echo "")
    if [ -z "$ADMIN_ARG" ]; then
        ADMIN_FROM_CONTRACT=$(cast call "$FISH_BAIT_ADDRESS" "admin()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "$ADMIN_ADDRESS")
        ADMIN_ARG=$(cast abi-encode "constructor(address)" "$ADMIN_FROM_CONTRACT")
    fi
    if verify_contract "FishBait" "src/FishBait.sol:FishBait" "$FISH_BAIT_ADDRESS" "$ADMIN_ARG"; then
        ((SUCCESS_COUNT++))
    fi
    ((VERIFY_COUNT++))
fi

# 5. FishingGame - constructor(address _admin, FishItStaking _staking, FishNFT _fishNFT, ZoneValidator _zoneValidator, FishBait _fishBait, address _revenueRecipient)
if [ -n "$GAME_ADDRESS" ] && [ -n "$STAKING_ADDRESS" ] && [ -n "$NFT_ADDRESS" ] && [ -n "$ZONE_VALIDATOR_ADDRESS" ] && [ -n "$FISH_BAIT_ADDRESS" ]; then
    REVENUE_RECIPIENT="${REVENUE_RECIPIENT_ADDRESS:-$ADMIN_ADDRESS}"
    if [ -z "$REVENUE_RECIPIENT" ] || [ "$REVENUE_RECIPIENT" = "0x0000000000000000000000000000000000000000" ]; then
        REVENUE_RECIPIENT=$(cast call "$GAME_ADDRESS" "revenueRecipient()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "$ADMIN_ADDRESS")
    fi
    ADMIN_FROM_CONTRACT=$(cast call "$GAME_ADDRESS" "admin()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "$ADMIN_ADDRESS")
    CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address,address,address,address,address)" \
        "$ADMIN_FROM_CONTRACT" \
        "$STAKING_ADDRESS" \
        "$NFT_ADDRESS" \
        "$ZONE_VALIDATOR_ADDRESS" \
        "$FISH_BAIT_ADDRESS" \
        "$REVENUE_RECIPIENT")
    if verify_contract "FishingGame" "src/FishingGame.sol:FishingGame" "$GAME_ADDRESS" "$CONSTRUCTOR_ARGS"; then
        ((SUCCESS_COUNT++))
    fi
    ((VERIFY_COUNT++))
fi

# 6. FishUpgrade - constructor(address _admin, FishNFT _fishNFT)
if [ -n "$FISH_UPGRADE_ADDRESS" ] && [ -n "$NFT_ADDRESS" ]; then
    ADMIN_FROM_CONTRACT=$(cast call "$FISH_UPGRADE_ADDRESS" "admin()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "$ADMIN_ADDRESS")
    CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN_FROM_CONTRACT" "$NFT_ADDRESS")
    if verify_contract "FishUpgrade" "src/FishUpgrade.sol:FishUpgrade" "$FISH_UPGRADE_ADDRESS" "$CONSTRUCTOR_ARGS"; then
        ((SUCCESS_COUNT++))
    fi
    ((VERIFY_COUNT++))
fi

# 7. FishMarketplace - constructor(address _admin, address _revenueRecipient)
if [ -n "$MARKETPLACE_ADDRESS" ]; then
    REVENUE_RECIPIENT="${REVENUE_RECIPIENT_ADDRESS:-$ADMIN_ADDRESS}"
    if [ -z "$REVENUE_RECIPIENT" ] || [ "$REVENUE_RECIPIENT" = "0x0000000000000000000000000000000000000000" ]; then
        REVENUE_RECIPIENT=$(cast call "$MARKETPLACE_ADDRESS" "revenueRecipient()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "$ADMIN_ADDRESS")
    fi
    ADMIN_FROM_CONTRACT=$(cast call "$MARKETPLACE_ADDRESS" "admin()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "$ADMIN_ADDRESS")
    CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN_FROM_CONTRACT" "$REVENUE_RECIPIENT")
    if verify_contract "FishMarketplace" "src/FishMarketplace.sol:FishMarketplace" "$MARKETPLACE_ADDRESS" "$CONSTRUCTOR_ARGS"; then
        ((SUCCESS_COUNT++))
    fi
    ((VERIFY_COUNT++))
fi

# Summary
echo ""
echo -e "${BLUE}=== Verification Summary ===${NC}"
echo "Attempted: $VERIFY_COUNT"
echo -e "${GREEN}Successful: $SUCCESS_COUNT${NC}"
echo -e "${RED}Failed: $((VERIFY_COUNT - SUCCESS_COUNT))${NC}"
echo ""

if [ $SUCCESS_COUNT -eq $VERIFY_COUNT ] && [ $VERIFY_COUNT -gt 0 ]; then
    echo -e "${GREEN}All contracts verified successfully!${NC}"
    exit 0
elif [ $SUCCESS_COUNT -gt 0 ]; then
    echo -e "${YELLOW}Some contracts failed verification. Check errors above.${NC}"
    echo ""
    echo -e "${BLUE}If verification failed due to API errors (503/502), you can:${NC}"
    echo "1. Try running the script again later (API may be temporarily unavailable)"
    echo "2. Verify contracts manually through the explorer web interface:"
    echo "   - Go to $EXPLORER_URL/address/<CONTRACT_ADDRESS>"
    echo "   - Click 'Verify and Publish' button"
    echo "   - Follow the verification wizard"
    echo ""
    exit 1
else
    echo -e "${RED}No contracts were verified.${NC}"
    if [ $VERIFY_COUNT -eq 0 ]; then
        echo -e "${YELLOW}Please check contract addresses in .env file.${NC}"
    else
        echo -e "${YELLOW}All verification attempts failed.${NC}"
        echo ""
        echo -e "${BLUE}If verification failed due to API errors (503/502), you can:${NC}"
        echo "1. Try running the script again later"
        echo "2. Verify contracts manually through the explorer web interface"
    fi
    exit 1
fi
