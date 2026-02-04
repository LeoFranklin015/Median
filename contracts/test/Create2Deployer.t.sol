// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {Create2Deployer} from "../src/Create2Deployer.sol";
import {ExampleCounter} from "../src/ExampleCounter.sol";

contract Create2DeployerTest is Test {
    Create2Deployer internal deployer;

    function setUp() external {
        deployer = new Create2Deployer();
    }

    function test_create2AddressMatchesComputation() external {
        bytes32 salt = keccak256("salt-1");
        uint256 initialNumber = 123;

        bytes memory initCode = abi.encodePacked(type(ExampleCounter).creationCode, abi.encode(initialNumber));
        bytes32 initCodeHash = keccak256(initCode);

        address predicted = deployer.computeAddress(salt, initCodeHash);
        address deployed = deployer.deploy(salt, initCode);

        assertEq(deployed, predicted, "deployed address != predicted");
        assertEq(ExampleCounter(deployed).number(), initialNumber, "constructor arg not set");
    }

    function test_sameSaltAndInitCodeCannotBeDeployedTwice() external {
        bytes32 salt = keccak256("salt-2");
        bytes memory initCode = abi.encodePacked(type(ExampleCounter).creationCode, abi.encode(uint256(1)));

        deployer.deploy(salt, initCode);

        vm.expectRevert(Create2Deployer.Create2DeployFailed.selector);
        deployer.deploy(salt, initCode);
    }

    function test_differentConstructorArgsYieldDifferentAddresses() external view {
        bytes32 salt = keccak256("salt-3");

        bytes memory initCodeA = abi.encodePacked(type(ExampleCounter).creationCode, abi.encode(uint256(1)));
        bytes memory initCodeB = abi.encodePacked(type(ExampleCounter).creationCode, abi.encode(uint256(2)));

        address predictedA = deployer.computeAddress(salt, keccak256(initCodeA));
        address predictedB = deployer.computeAddress(salt, keccak256(initCodeB));

        assertTrue(predictedA != predictedB, "addresses should differ");
    }
}

