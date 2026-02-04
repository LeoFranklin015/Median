// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ExampleCounter {
    uint256 public number;

    constructor(uint256 initialNumber) {
        number = initialNumber;
    }

    function setNumber(uint256 newNumber) external {
        number = newNumber;
    }

    function increment() external {
        unchecked {
            number++;
        }
    }
}

