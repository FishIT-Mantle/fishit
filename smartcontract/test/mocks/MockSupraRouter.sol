// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISupraRouter} from "../../src/interfaces/ISupraRouter.sol";

/**
 * @title MockSupraRouter
 * @notice Mock Supra Router for testing purposes
 */
contract MockSupraRouter is ISupraRouter {
    uint256 public nextRequestId = 1;
    mapping(uint256 => address) public requestCallbacks;
    mapping(uint256 => string) public requestFunctionSigs;

    function generateRequest(
        string memory _functionSig,
        uint8 _rngCount,
        uint256 _numConfirmations,
        uint256 _clientSeed,
        address _clientWalletAddress
    ) external override returns (uint256) {
        uint256 requestId = nextRequestId++;
        requestCallbacks[requestId] = _clientWalletAddress;
        requestFunctionSigs[requestId] = _functionSig;
        return requestId;
    }

    /**
     * @notice Simulate Supra callback - call this manually in tests
     */
    function fulfillRequest(
        uint256 _requestId,
        uint256[] memory _rngList,
        uint256 _clientSeed
    ) external {
        address callbackAddress = requestCallbacks[_requestId];
        require(callbackAddress != address(0), "Invalid request");
        
        // Call the callback function
        (bool success, ) = callbackAddress.call(
            abi.encodeWithSignature(
                requestFunctionSigs[_requestId],
                _requestId,
                _rngList,
                _clientSeed
            )
        );
        require(success, "Callback failed");
    }
}

