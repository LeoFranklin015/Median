// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {SyntheticToken} from "../src/SyntheticToken.sol";

/// @notice Deploys SyntheticToken contracts for stock symbols
contract DeploySyntheticTokens is Script {
    uint8 constant DECIMALS = 18;
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18; // 1M tokens

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(pk);

        // Deploy based on chain ID
        if (block.chainid == 11155111) {
            // Sepolia: AAPL, NVDA, ONDS
            _deployToken("Apple Inc.", "AAPL", deployer);
            _deployToken("NVIDIA Corporation", "NVDA", deployer);
            _deployToken("Ondas Holdings Inc.", "ONDS", deployer);
        } else if (block.chainid == 84532) {
            // Base Sepolia: AMZN, PFE, META
            _deployToken("Amazon.com Inc.", "AMZN", deployer);
            _deployToken("Pfizer Inc.", "PFE", deployer);
            _deployToken("Meta Platforms Inc.", "META", deployer);
        } else if (block.chainid == 421614) {
            // Arbitrum Sepolia: GOOG, INTC, NFLX
            _deployToken("Alphabet Inc.", "GOOG", deployer);
            _deployToken("Intel Corporation", "INTC", deployer);
            _deployToken("Netflix Inc.", "NFLX", deployer);
        } else if (block.chainid == 5042002) {
            // Arc Testnet: MSFT, SOFI, AMD
            _deployToken("Microsoft Corporation", "MSFT", deployer);
            _deployToken("SoFi Technologies Inc.", "SOFI", deployer);
            _deployToken("Advanced Micro Devices Inc.", "AMD", deployer);
        } else if (block.chainid == 11155420) {
            // Optimism Sepolia: TSLA, OPEN, JPM
            _deployToken("Tesla Inc.", "TSLA", deployer);
            _deployToken("Opendoor Technologies Inc.", "OPEN", deployer);
            _deployToken("JPMorgan Chase & Co.", "JPM", deployer);
        }

        vm.stopBroadcast();
    }

    function _deployToken(string memory name, string memory symbol, address owner) internal returns (address) {
        SyntheticToken token = new SyntheticToken(
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
