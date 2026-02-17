// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {SyntheticToken} from "../src/SyntheticToken.sol";

/// @notice Redeploys Arc Testnet tokens (MSFT, SOFI, AMD) on Base Sepolia
/// @dev Uses the Arc Testnet chain ID (5042002) in the salt to produce the same CREATE2 addresses
contract DeployArcTokensOnBase is Script {
    uint8 constant DECIMALS = 18;
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;
    uint256 constant DEPLOYMENT_VERSION = 2;
    uint256 constant ARC_CHAIN_ID = 5042002;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        require(block.chainid == 84532, "This script is for Base Sepolia only");

        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        console2.log("Using Arc Testnet chain ID in salt:", ARC_CHAIN_ID);

        vm.startBroadcast(pk);

        _deployToken("Microsoft Corporation", "MSFT", deployer, 1);
        _deployToken("SoFi Technologies Inc.", "SOFI", deployer, 2);
        _deployToken("Advanced Micro Devices Inc.", "AMD", deployer, 3);

        vm.stopBroadcast();
    }

    function _deployToken(string memory name, string memory symbol, address owner, uint256 tokenIndex) internal returns (address) {
        // Use Arc Testnet chain ID in salt to match original addresses
        bytes32 salt = keccak256(abi.encodePacked(ARC_CHAIN_ID, symbol, tokenIndex, DEPLOYMENT_VERSION));

        SyntheticToken token = new SyntheticToken{salt: salt}(
            name,
            symbol,
            DECIMALS,
            INITIAL_SUPPLY,
            owner,
            owner
        );
        console2.log(symbol, ":", address(token));
        return address(token);
    }
}
