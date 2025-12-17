#!/bin/bash

# Setup script untuk FishIt smart contract project
# Install dependencies yang diperlukan

set -e

echo "=== FishIt Smart Contract Setup ==="

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry/Forge tidak terinstall"
    echo "Install dari: https://getfoundry.sh/"
    exit 1
fi

echo "✓ Foundry terdeteksi"

# Install OpenZeppelin contracts
if [ ! -d "lib/openzeppelin-contracts" ]; then
    echo "Installing OpenZeppelin contracts..."
    forge install OpenZeppelin/openzeppelin-contracts --no-commit
    echo "✓ OpenZeppelin contracts installed"
else
    echo "✓ OpenZeppelin contracts sudah ada"
fi

# Build contracts
echo "Building contracts..."
forge build

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Set environment variables (.env file):"
echo "   PRIVATE_KEY=your_private_key"
echo "   RPC_URL=https://rpc.testnet.mantle.xyz"
echo ""
echo "2. Deploy contracts:"
echo "   forge script script/DeployFishIt.s.sol:DeployFishIt --rpc-url \$RPC_URL --broadcast"
echo ""
echo "3. Test interactions:"
echo "   forge script script/TestInteractions.s.sol:TestInteractions --rpc-url \$RPC_URL --broadcast"

