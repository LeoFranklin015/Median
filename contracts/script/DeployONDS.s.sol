// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {SyntheticToken} from "../src/SyntheticToken.sol";

/// @notice Deploys only the ONDS (Ondas Holdings) SyntheticToken on Sepolia
contract DeployONDS is Script {
    uint8 constant DECIMALS = 18;
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;
    uint256 constant DEPLOYMENT_VERSION = 3;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        require(block.chainid == 11155111, "This script is for Sepolia only");

        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(pk);

        bytes32 salt = keccak256(abi.encodePacked(block.chainid, "ONDS", uint256(3), DEPLOYMENT_VERSION));

        SyntheticToken token = new SyntheticToken{salt: salt}(
            "Ondas Holdings Inc.",
            "ONDS",
            DECIMALS,
            INITIAL_SUPPLY,
            deployer,
            deployer
        );
        console2.log("ONDS:", address(token));

        vm.stopBroadcast();
    }
}
