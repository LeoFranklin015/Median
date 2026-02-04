// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {Create2Deployer} from "../src/Create2Deployer.sol";
import {ExampleCounter} from "../src/ExampleCounter.sol";

/// @notice Deploys Create2Deployer, then deterministically deploys ExampleCounter via CREATE2.
/// @dev Env vars:
/// - PRIVATE_KEY (required): broadcaster key
/// - SALT (optional, bytes32): CREATE2 salt. Default: keccak256("hackmoney:create2")
/// - INITIAL_NUMBER (optional, uint): constructor arg for ExampleCounter. Default: 0
contract DeployCreate2 is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        bytes32 salt = _salt();
        uint256 initialNumber = _initialNumber();

        vm.startBroadcast(pk);

        Create2Deployer deployer = new Create2Deployer();

        bytes memory initCode = abi.encodePacked(type(ExampleCounter).creationCode, abi.encode(initialNumber));
        bytes32 initCodeHash = keccak256(initCode);
        address predicted = deployer.computeAddress(salt, initCodeHash);

        console2.log("Create2Deployer:", address(deployer));
        console2.logBytes32(salt);
        console2.log("Predicted ExampleCounter:", predicted);

        if (predicted.code.length == 0) {
            address deployed = deployer.deploy(salt, initCode);
            require(deployed == predicted, "predicted != deployed");
            console2.log("Deployed ExampleCounter:", deployed);
        } else {
            console2.log("Already deployed at predicted address.");
        }

        vm.stopBroadcast();
    }

    function _salt() internal view returns (bytes32) {
        // If SALT is not set, default deterministically.
        // (forge will throw if env var missing, so we try/catch via ffi-free pattern: read as string)
        // If you want full control, export SALT=0x... (32 bytes).
        try vm.envBytes32("SALT") returns (bytes32 s) {
            return s;
        } catch {
            return keccak256("hackmoney:create2");
        }
    }

    function _initialNumber() internal view returns (uint256) {
        try vm.envUint("INITIAL_NUMBER") returns (uint256 n) {
            return n;
        } catch {
            return 0;
        }
    }
}

