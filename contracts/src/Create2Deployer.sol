// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal CREATE2 deployer that can deterministically deploy any init code.
/// @dev Address is derived from: keccak256(0xff ++ deployer ++ salt ++ keccak256(init_code)).
contract Create2Deployer {
    error Create2DeployFailed();

    event Deployed(address indexed deployed, bytes32 indexed salt, bytes32 indexed initCodeHash);

    /// @notice Deploy a contract using CREATE2.
    /// @param salt The CREATE2 salt.
    /// @param initCode The contract creation bytecode (including constructor args).
    /// @return deployed The deployed contract address.
    function deploy(bytes32 salt, bytes calldata initCode) external payable returns (address deployed) {
        bytes32 initCodeHash = keccak256(initCode);

        assembly ("memory-safe") {
            let ptr := mload(0x40)
            calldatacopy(ptr, initCode.offset, initCode.length)
            deployed := create2(callvalue(), ptr, initCode.length, salt)
        }

        if (deployed == address(0)) revert Create2DeployFailed();
        emit Deployed(deployed, salt, initCodeHash);
    }

    /// @notice Compute the CREATE2 address for a deployment from this contract.
    function computeAddress(bytes32 salt, bytes32 initCodeHash) external view returns (address) {
        return computeAddress(address(this), salt, initCodeHash);
    }

    /// @notice Compute the CREATE2 address for a deployment.
    function computeAddress(address deployer, bytes32 salt, bytes32 initCodeHash) public pure returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash));
        return address(uint160(uint256(hash)));
    }
}

