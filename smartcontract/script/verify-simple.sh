#!/bin/bash

# Simple verification script for FishIt smart contracts
# This script provides forge verify-contract commands for each contract

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Load environment variables
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please create .env file or run setup-env.sh first"
    exit 1
fi

source .env

# Check required variables
if [ -z "$RPC_URL" ]; then
    echo "Error: RPC_URL not set in .env"
    exit 1
fi

if [ -z "$CHAIN_ID" ]; then
    CHAIN_ID=5003
fi

# Determine Blockscout API URL based on chain ID
if [ "$CHAIN_ID" = "5003" ]; then
    VERIFIER_URL="https://explorer.sepolia.mantle.xyz/api"
elif [ "$CHAIN_ID" = "5000" ]; then
    VERIFIER_URL="https://explorer.mantle.xyz/api"
else
    VERIFIER_URL="https://explorer.sepolia.mantle.xyz/api"
    CHAIN_ID=5003
fi

# Compiler settings
OPTIMIZER_RUNS=200
if grep -q "optimizer_runs" foundry.toml 2>/dev/null; then
    OPTIMIZER_RUNS=$(grep -oP 'optimizer_runs\s*=\s*\K\d+' foundry.toml || echo "200")
fi

echo "=== FishIt Contract Verification Commands ==="
echo "Network: $RPC_URL"
echo "Chain ID: $CHAIN_ID"
echo "Verifier URL: $VERIFIER_URL"
echo "Optimizer runs: $OPTIMIZER_RUNS"
echo ""

# Function to generate verify command
generate_verify_cmd() {
    local contract_name=$1
    local contract_path=$2
    local contract_address=$3
    local constructor_args=$4
    
    if [ -z "$contract_address" ] || [ "$contract_address" = "0x0000000000000000000000000000000000000000" ]; then
        echo "# $contract_name: Address not found in .env"
        return
    fi
    
    echo "# Verify $contract_name"
    echo "# Address: $contract_address"
    local cmd="forge verify-contract \\"
    cmd="$cmd\n  --chain-id $CHAIN_ID \\"
    cmd="$cmd\n  --num-of-optimizations $OPTIMIZER_RUNS \\"
    cmd="$cmd\n  --watch \\"
    cmd="$cmd\n  --verifier blockscout \\"
    cmd="$cmd\n  --verifier-url $VERIFIER_URL \\"
    cmd="$cmd\n  --rpc-url $RPC_URL"
    
    if [ -n "$constructor_args" ]; then
        cmd="$cmd \\\n  --constructor-args $constructor_args"
    fi
    
    cmd="$cmd \\\n  $contract_address \\"
    cmd="$cmd\n  $contract_path"
    
    echo -e "$cmd"
    echo ""
}

# Get admin/owner addresses from contracts or use env var
if [ -z "$ADMIN_ADDRESS" ] || [ "$ADMIN_ADDRESS" = "0x0000000000000000000000000000000000000000" ]; then
    # Try to get deployer address from private key
    if [ -n "$PRIVATE_KEY" ]; then
        ADMIN_ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null || echo "")
    fi
fi

# If still no admin, try to get from first contract
if [ -z "$ADMIN_ADDRESS" ] && [ -n "$STAKING_ADDRESS" ]; then
    ADMIN_ADDRESS=$(cast call "$STAKING_ADDRESS" "admin()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
fi

if [ -z "$ADMIN_ADDRESS" ]; then
    echo "Warning: Could not determine admin address"
    echo "Please set ADMIN_ADDRESS in .env or ensure contracts are deployed"
    echo ""
fi

# 1. FishItStaking - constructor(address _admin)
if [ -n "$STAKING_ADDRESS" ]; then
    if [ -n "$ADMIN_ADDRESS" ]; then
        ADMIN_ARG=$(cast abi-encode "constructor(address)" "$ADMIN_ADDRESS" 2>/dev/null || echo "")
        generate_verify_cmd "FishItStaking" "src/FishItStaking.sol:FishItStaking" "$STAKING_ADDRESS" "$ADMIN_ARG"
    else
        generate_verify_cmd "FishItStaking" "src/FishItStaking.sol:FishItStaking" "$STAKING_ADDRESS" ""
        echo "# Note: Get admin address first: cast call $STAKING_ADDRESS 'admin()(address)' --rpc-url $RPC_URL"
        echo "# Then encode: cast abi-encode 'constructor(address)' <ADMIN_ADDRESS>"
        echo ""
    fi
fi

# 2. FishNFT - constructor(address _owner)
if [ -n "$NFT_ADDRESS" ]; then
    if [ -n "$ADMIN_ADDRESS" ]; then
        OWNER_ARG=$(cast abi-encode "constructor(address)" "$ADMIN_ADDRESS" 2>/dev/null || echo "")
        generate_verify_cmd "FishNFT" "src/FishNFT.sol:FishNFT" "$NFT_ADDRESS" "$OWNER_ARG"
    else
        generate_verify_cmd "FishNFT" "src/FishNFT.sol:FishNFT" "$NFT_ADDRESS" ""
        echo "# Note: Get owner address first: cast call $NFT_ADDRESS 'owner()(address)' --rpc-url $RPC_URL"
        echo "# Then encode: cast abi-encode 'constructor(address)' <OWNER_ADDRESS>"
        echo ""
    fi
fi

# 3. ZoneValidator - constructor(address _admin, FishItStaking _staking, FishNFT _fishNFT)
if [ -n "$ZONE_VALIDATOR_ADDRESS" ] && [ -n "$STAKING_ADDRESS" ] && [ -n "$NFT_ADDRESS" ]; then
    if [ -n "$ADMIN_ADDRESS" ]; then
        CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address,address)" "$ADMIN_ADDRESS" "$STAKING_ADDRESS" "$NFT_ADDRESS" 2>/dev/null || echo "")
        generate_verify_cmd "ZoneValidator" "src/ZoneValidator.sol:ZoneValidator" "$ZONE_VALIDATOR_ADDRESS" "$CONSTRUCTOR_ARGS"
    else
        generate_verify_cmd "ZoneValidator" "src/ZoneValidator.sol:ZoneValidator" "$ZONE_VALIDATOR_ADDRESS" ""
        echo "# Note: Get admin, staking, and NFT addresses, then encode:"
        echo "# cast abi-encode 'constructor(address,address,address)' <ADMIN> <STAKING> <NFT>"
        echo ""
    fi
fi

# 4. FishBait - constructor(address _admin)
if [ -n "$FISH_BAIT_ADDRESS" ]; then
    if [ -n "$ADMIN_ADDRESS" ]; then
        ADMIN_ARG=$(cast abi-encode "constructor(address)" "$ADMIN_ADDRESS" 2>/dev/null || echo "")
        generate_verify_cmd "FishBait" "src/FishBait.sol:FishBait" "$FISH_BAIT_ADDRESS" "$ADMIN_ARG"
    else
        generate_verify_cmd "FishBait" "src/FishBait.sol:FishBait" "$FISH_BAIT_ADDRESS" ""
        echo "# Note: Get admin address first: cast call $FISH_BAIT_ADDRESS 'admin()(address)' --rpc-url $RPC_URL"
        echo "# Then encode: cast abi-encode 'constructor(address)' <ADMIN_ADDRESS>"
        echo ""
    fi
fi

# 5. FishingGame - constructor(address _admin, FishItStaking _staking, FishNFT _fishNFT, ZoneValidator _zoneValidator, FishBait _fishBait, address _revenueRecipient)
if [ -n "$GAME_ADDRESS" ] && [ -n "$STAKING_ADDRESS" ] && [ -n "$NFT_ADDRESS" ] && [ -n "$ZONE_VALIDATOR_ADDRESS" ] && [ -n "$FISH_BAIT_ADDRESS" ]; then
    REVENUE_RECIPIENT="${REVENUE_RECIPIENT_ADDRESS:-$ADMIN_ADDRESS}"
    if [ -n "$ADMIN_ADDRESS" ] && [ -n "$REVENUE_RECIPIENT" ]; then
        CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address,address,address,address,address)" \
            "$ADMIN_ADDRESS" \
            "$STAKING_ADDRESS" \
            "$NFT_ADDRESS" \
            "$ZONE_VALIDATOR_ADDRESS" \
            "$FISH_BAIT_ADDRESS" \
            "$REVENUE_RECIPIENT" 2>/dev/null || echo "")
        generate_verify_cmd "FishingGame" "src/FishingGame.sol:FishingGame" "$GAME_ADDRESS" "$CONSTRUCTOR_ARGS"
    else
        generate_verify_cmd "FishingGame" "src/FishingGame.sol:FishingGame" "$GAME_ADDRESS" ""
        echo "# Note: Get all required addresses, then encode:"
        echo "# cast abi-encode 'constructor(address,address,address,address,address,address)' <ADMIN> <STAKING> <NFT> <ZONE_VALIDATOR> <FISH_BAIT> <REVENUE_RECIPIENT>"
        echo ""
    fi
fi

# 6. FishUpgrade - constructor(address _admin, FishNFT _fishNFT)
if [ -n "$FISH_UPGRADE_ADDRESS" ] && [ -n "$NFT_ADDRESS" ]; then
    if [ -n "$ADMIN_ADDRESS" ]; then
        CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN_ADDRESS" "$NFT_ADDRESS" 2>/dev/null || echo "")
        generate_verify_cmd "FishUpgrade" "src/FishUpgrade.sol:FishUpgrade" "$FISH_UPGRADE_ADDRESS" "$CONSTRUCTOR_ARGS"
    else
        generate_verify_cmd "FishUpgrade" "src/FishUpgrade.sol:FishUpgrade" "$FISH_UPGRADE_ADDRESS" ""
        echo "# Note: Get admin and NFT addresses, then encode:"
        echo "# cast abi-encode 'constructor(address,address)' <ADMIN> <NFT_ADDRESS>"
        echo ""
    fi
fi

# 7. FishMarketplace - constructor(address _admin, address _revenueRecipient)
if [ -n "$MARKETPLACE_ADDRESS" ]; then
    REVENUE_RECIPIENT="${REVENUE_RECIPIENT_ADDRESS:-$ADMIN_ADDRESS}"
    if [ -n "$ADMIN_ADDRESS" ] && [ -n "$REVENUE_RECIPIENT" ]; then
        CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN_ADDRESS" "$REVENUE_RECIPIENT" 2>/dev/null || echo "")
        generate_verify_cmd "FishMarketplace" "src/FishMarketplace.sol:FishMarketplace" "$MARKETPLACE_ADDRESS" "$CONSTRUCTOR_ARGS"
    else
        generate_verify_cmd "FishMarketplace" "src/FishMarketplace.sol:FishMarketplace" "$MARKETPLACE_ADDRESS" ""
        echo "# Note: Get admin and revenue recipient addresses, then encode:"
        echo "# cast abi-encode 'constructor(address,address)' <ADMIN> <REVENUE_RECIPIENT>"
        echo ""
    fi
fi

echo "=== Usage ==="
echo "Copy the commands above and run them individually, or pipe to bash:"
echo "  ./script/verify-simple.sh > verify-commands.sh"
echo "  chmod +x verify-commands.sh"
echo "  ./verify-commands.sh"
echo ""
echo "Or run specific contract verification by copying its command and executing it."
echo ""

