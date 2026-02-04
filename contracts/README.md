# Contracts (Foundry)

This folder contains Solidity contracts + scripts/tests using Foundry.

## CREATE2 deployment

We deploy deterministically via `Create2Deployer`:

- `src/Create2Deployer.sol`: generic CREATE2 deployer + address computation helpers
- `src/ExampleCounter.sol`: example contract with a constructor arg
- `script/DeployCreate2.s.sol`: deploy deployer + deploy `ExampleCounter` via CREATE2
- `test/Create2Deployer.t.sol`: tests that the computed address matches the deployed address

### Run tests

```bash
cd contracts
forge test -vv
```

### Run the CREATE2 deployment script

Set env vars:

- `PRIVATE_KEY` (required): broadcaster private key as a number (Foundry style)
- `SALT` (optional): `bytes32` hex string (32 bytes). If omitted, defaults to `keccak256("hackmoney:create2")`
- `INITIAL_NUMBER` (optional): constructor arg for `ExampleCounter` (default `0`)

Example (explicit RPC URL):

```bash
cd contracts
export PRIVATE_KEY=1234
export SALT=0x0000000000000000000000000000000000000000000000000000000000000042
export INITIAL_NUMBER=7

forge script script/DeployCreate2.s.sol:DeployCreate2 \
  --rpc-url "$RPC_URL" \
  --broadcast \
  -vv
```

## Multiple chains

### Configure named RPC endpoints

`foundry.toml` defines names under `[rpc_endpoints]`. Set the matching env vars in your shell (or `.env`, if you use one locally):

```bash
export SEPOLIA_RPC_URL="https://..."
export BASE_SEPOLIA_RPC_URL="https://..."
```

Then you can run against a chain by name:

```bash
cd contracts
export PRIVATE_KEY=1234
forge script script/DeployCreate2.s.sol:DeployCreate2 --rpc-url sepolia --broadcast -vv
forge script script/DeployCreate2.s.sol:DeployCreate2 --rpc-url base_sepolia --broadcast -vv
```

### Important CREATE2 note (addresses differ per chain)

The CREATE2 address depends on the **deployer contract address**. Since `Create2Deployer` is deployed separately on each chain, its address will usually differ — meaning the predicted/deployed CREATE2 address will also differ across chains even with the same salt + init code.

If you need the *same* CREATE2 target address across many chains, use a deployer that’s already at a fixed address on those chains (commonly the “universal CREATE2 deployer”, EIP-2470), or deploy your factory to the same address everywhere (advanced).

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
