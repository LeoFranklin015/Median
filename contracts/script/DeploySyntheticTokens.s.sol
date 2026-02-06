// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {SyntheticToken} from "../src/SyntheticToken.sol";

/// @notice Deploys SyntheticToken contracts for stock symbols
/// @dev Uses CREATE2 with chain-specific salt to ensure unique addresses per chain
contract DeploySyntheticTokens is Script {
    uint8 constant DECIMALS = 18;
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18; // 1M tokens

    // Version salt to force new addresses on redeployment
    uint256 constant DEPLOYMENT_VERSION = 2;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployment Version:", DEPLOYMENT_VERSION);

        vm.startBroadcast(pk);

        // Deploy based on chain ID
        if (block.chainid == 11155111) {
            // Sepolia: AAPL, NVDA, ONDS
            _deployToken("Apple Inc.", "AAPL", deployer, 1);
            _deployToken("NVIDIA Corporation", "NVDA", deployer, 2);
            _deployToken("Ondas Holdings Inc.", "ONDS", deployer, 3);
        } else if (block.chainid == 84532) {
            // Base Sepolia: AMZN, PFE, META
            _deployToken("Amazon.com Inc.", "AMZN", deployer, 1);
            _deployToken("Pfizer Inc.", "PFE", deployer, 2);
            _deployToken("Meta Platforms Inc.", "META", deployer, 3);
        } else if (block.chainid == 421614) {
            // Arbitrum Sepolia: GOOG, INTC, NFLX
            _deployToken("Alphabet Inc.", "GOOG", deployer, 1);
            _deployToken("Intel Corporation", "INTC", deployer, 2);
            _deployToken("Netflix Inc.", "NFLX", deployer, 3);
        } else if (block.chainid == 5042002) {
            // Arc Testnet: MSFT, SOFI, AMD
            _deployToken("Microsoft Corporation", "MSFT", deployer, 1);
            _deployToken("SoFi Technologies Inc.", "SOFI", deployer, 2);
            _deployToken("Advanced Micro Devices Inc.", "AMD", deployer, 3);
        } else if (block.chainid == 11155420) {
            // Optimism Sepolia: TSLA, OPEN, JPM
            _deployToken("Tesla Inc.", "TSLA", deployer, 1);
            _deployToken("Opendoor Technologies Inc.", "OPEN", deployer, 2);
            _deployToken("JPMorgan Chase & Co.", "JPM", deployer, 3);
        }

        vm.stopBroadcast();
    }

    function _deployToken(string memory name, string memory symbol, address owner, uint256 tokenIndex) internal returns (address) {
        // Create unique salt combining chain ID, token index, and deployment version
        bytes32 salt = keccak256(abi.encodePacked(block.chainid, symbol, tokenIndex, DEPLOYMENT_VERSION));

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
