// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISupraRouter
 * @notice Interface for Supra VRF Router Contract
 * @dev Based on Supra VRF V2 documentation for Mantle Network
 */
interface ISupraRouter {
    /**
     * @notice Generate a VRF request to Supra Router
     * @param _functionSig Function signature that will be called as callback
     * @param _rngCount Number of random numbers to generate (1 for our use case)
     * @param _numConfirmations Number of block confirmations before callback
     * @param _clientSeed Client seed for additional randomness
     * @param _clientWalletAddress Address that will receive the callback
     * @return requestId The request ID for tracking
     */
    function generateRequest(
        string memory _functionSig,
        uint8 _rngCount,
        uint256 _numConfirmations,
        uint256 _clientSeed,
        address _clientWalletAddress
    ) external returns (uint256);
}

