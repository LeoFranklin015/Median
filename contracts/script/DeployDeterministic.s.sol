// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {BalanceChecker} from "../src/BalanceChecker.sol";
import {Custody} from "../src/Custody.sol";
import {SimpleConsensus} from "../src/adjudicators/SimpleConsensus.sol";

/// @notice Deploys BalanceChecker, Custody, and SimpleConsensus with deterministic addresses using CREATE2.
/// @dev Uses the keyless CREATE2 factory at 0x4e59b44847b379578588920cA78FbF26c0B4956C
/// Env vars:
/// - PRIVATE_KEY (required): broadcaster key
contract DeployDeterministic is Script {
    // Salt for deterministic deployment - change this to get different addresses
    bytes32 constant SALT = keccak256("median:v1");

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        console2.log("");

        // Compute addresses before deployment using forge-std's CREATE2_FACTORY
        bytes memory balanceCheckerInitCode = type(BalanceChecker).creationCode;
        bytes memory custodyInitCode = type(Custody).creationCode;

        address predictedBalanceChecker = computeCreate2Address(SALT, keccak256(balanceCheckerInitCode));
        address predictedCustody = computeCreate2Address(SALT, keccak256(custodyInitCode));

        // SimpleConsensus constructor args: (owner, channelImpl)
        // owner = deployer, channelImpl = Custody address
        bytes memory simpleConsensusInitCode = abi.encodePacked(
            type(SimpleConsensus).creationCode,
            abi.encode(deployer, predictedCustody)
        );
        address predictedSimpleConsensus = computeCreate2Address(SALT, keccak256(simpleConsensusInitCode));

        console2.log("Predicted addresses:");
        console2.log("  BalanceChecker:", predictedBalanceChecker);
        console2.log("  Custody:", predictedCustody);
        console2.log("  SimpleConsensus:", predictedSimpleConsensus);
        console2.log("");

        vm.startBroadcast(pk);

        // Deploy BalanceChecker
        address balanceChecker;
        if (predictedBalanceChecker.code.length == 0) {
            balanceChecker = _deploy(SALT, balanceCheckerInitCode);
            console2.log("Deployed BalanceChecker:", balanceChecker);
        } else {
            balanceChecker = predictedBalanceChecker;
            console2.log("BalanceChecker already deployed at:", balanceChecker);
        }
        require(balanceChecker == predictedBalanceChecker, "BalanceChecker address mismatch");

        // Deploy Custody
        address custody;
        if (predictedCustody.code.length == 0) {
            custody = _deploy(SALT, custodyInitCode);
            console2.log("Deployed Custody:", custody);
        } else {
            custody = predictedCustody;
            console2.log("Custody already deployed at:", custody);
        }
        require(custody == predictedCustody, "Custody address mismatch");

        // Deploy SimpleConsensus
        address simpleConsensus;
        if (predictedSimpleConsensus.code.length == 0) {
            simpleConsensus = _deploy(SALT, simpleConsensusInitCode);
            console2.log("Deployed SimpleConsensus:", simpleConsensus);
        } else {
            simpleConsensus = predictedSimpleConsensus;
            console2.log("SimpleConsensus already deployed at:", simpleConsensus);
        }
        require(simpleConsensus == predictedSimpleConsensus, "SimpleConsensus address mismatch");

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== Deployment Complete ===");
        console2.log("BalanceChecker:", balanceChecker);
        console2.log("Custody:", custody);
        console2.log("SimpleConsensus:", simpleConsensus);
    }

    function _deploy(bytes32 salt, bytes memory initCode) internal returns (address deployed) {
        bytes memory payload = abi.encodePacked(salt, initCode);
        (bool success, bytes memory result) = CREATE2_FACTORY.call(payload);
        require(success, "CREATE2 deployment failed");
        deployed = address(bytes20(result));
    }
}
