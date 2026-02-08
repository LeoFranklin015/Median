# Median

**Synthetic stock trading on Web3 rails.**

Trade AAPL, TSLA, GOOGL, NVDA using USDC — no brokerage, no T+1 delays. Spot and perpetuals with instant settlement.

---

## What is Median?

Median is a synthetic stock trading platform where users can:

- **Buy stocks with USDC** — Spot trading at real-time prices
- **Trade perpetuals** — Long/short with up to 10x leverage, no expiry
- **Swap stocks directly** — Trade 2 AAPL for TSLA without selling first
- **Deposit from any chain** — Base, Arbitrum, Optimism
- **Withdraw to any chain** — Unified balance, one-click exit

All trades settle in milliseconds. Zero gas during trading. Non-custodial.

---

<img width="5142" height="2356" alt="image" src="https://github.com/user-attachments/assets/351c7aa2-3578-4f5c-b6c1-ace7888b93e4" />


## Protocols Used

### Yellow Network

> *The trading layer*

Users deposit USDC from any chain into Yellow state channels. ClearSync aggregates all deposits into a single unified balance — one number, regardless of source chain. Every trade runs inside an App Session where the user submits an order, our Resolver fetches the price and submits a new state, and balances update instantly. All off-chain, no gas, settles in milliseconds. Withdrawals route through the same unified balance to any destination chain.

Production Yellow node: wss://yellow.philotheephilix.in/ws

**What we use:**
- State Channels — Off-chain trading
- ClearSync — Unified multi-chain balance
- App Sessions — Per-trade execution
- Resolver — Price fetching + state updates

---

### Circle Arc + Gateway

> *The liquidity hub*

Arc + Gateway is our liquidity backbone. When a user withdraws USDC to a chain where our platform is low on funds, Gateway automatically sources liquidity cross-chain — burns from our unified balance, mints on the destination chain. User just receives their funds, doesn't know it came from another network. This means we never need to pre-position capital on every chain or worry about liquidity fragmentation. One unified USDC surface across Base, Arbitrum, and Optimism — Gateway handles the routing.

**What we use:**
- Gateway — Cross-chain USDC routing
- Unified Balance — Single liquidity pool across chains
- Auto-rebalancing — No manual liquidity management

---

### ENS + JustaName

> *The identity layer*

Every user mints a subname on signup via JustaName (alice.median.eth, bob.median.eth). All platform contracts are ENS-named too — so users never see a hex address anywhere in the app. Send funds to a username, not 0x7a3d...8f2c. It makes the entire trading experience human-readable and removes a major UX barrier for non-crypto-native users.

**What we use:**
- JustaName — Subname minting on signup
- ENS Resolution — Human-readable addresses
- Contract Naming — All contracts have .median.eth names

---

## Contracts

All contracts are ENS-named under `median.eth`:

| Symbol | Name | ENS Name | Address | Chain |
|--------|------|----------|---------|-------|
| AAPL | Apple Inc. | [`aapl.median.eth`](https://sepolia.app.ens.domains/aapl.median.eth) | `0x9530f7d8F774cE3b3eDa95229E24687Fe072dD7B` | Sepolia |
| NVDA | NVIDIA Corporation | [`nvda.median.eth`](https://sepolia.app.ens.domains/nvda.median.eth) | `0xD19b51A44a13213B3afCCFf91245f2dAee5D570B` | Sepolia |
| ONDS | Ondas Holdings Inc. | [`onds.median.eth`](https://sepolia.app.ens.domains/onds.median.eth) | `0xC11E33c52dac4B95b4E4B85dC67B365e1c667cBC` | Sepolia |
| AMZN | Amazon.com Inc. | [`amzn.median.eth`](https://sepolia.app.ens.domains/amzn.median.eth) | `0xaA7389Cc693354624D487737989F6806f815A5D2` | Base Sepolia |
| PFE | Pfizer Inc. | [`pfe.median.eth`](https://sepolia.app.ens.domains/pfe.median.eth) | `0xA46B069488926fc15430404Ea29c3032A1F3654C` | Base Sepolia |
| META | Meta Platforms Inc. | [`meta.median.eth`](https://sepolia.app.ens.domains/meta.median.eth) | `0xD7A2f948f846c23Fd34cf380F828638E7d818b5b` | Base Sepolia |
| GOOG | Alphabet Inc. | [`goog.median.eth`](https://sepolia.app.ens.domains/goog.median.eth) | `0xEC018557a1Ab92DC04D2655E268E1FEcf321F8b5` | Arbitrum Sepolia |
| INTC | Intel Corporation | [`intc.median.eth`](https://sepolia.app.ens.domains/intc.median.eth) | `0x89FFd589d7Ebd966B18b8643EAb3E3018EE494d7` | Arbitrum Sepolia |
| NFLX | Netflix Inc. | [`nflx.median.eth`](https://sepolia.app.ens.domains/nflx.median.eth) | `0x9e2B9B0B2303A58DFd4aEB049D77c81C8DeF2e04` | Arbitrum Sepolia |
| MSFT | Microsoft Corporation | [`msft.median.eth`](https://sepolia.app.ens.domains/msft.median.eth) | `0xf1b6A03293463BF824aC4F559C2948E1C5b1852e` | Arc Testnet |
| SOFI | SoFi Technologies Inc. | [`sofi.median.eth`](https://sepolia.app.ens.domains/sofi.median.eth) | `0x1Cf30db4Cbe5A76b6f9E2cfFeD3E25ab36041283` | Arc Testnet |
| AMD | Advanced Micro Devices Inc. | [`amd.median.eth`](https://sepolia.app.ens.domains/amd.median.eth) | `0x8fc8083235E4C0bf978feD1AfE4A317B94c2Ef77` | Arc Testnet |
| TSLA | Tesla Inc. | [`tsla.median.eth`](https://sepolia.app.ens.domains/tsla.median.eth) | `0xd201A97A0C33441f4bea12d9890703f92f3c0A32` | OP Sepolia |
| OPEN | Opendoor Technologies Inc. | [`open.median.eth`](https://sepolia.app.ens.domains/open.median.eth) | `0x756bfd9186E108fa53D9a972836D009C2CB887cf` | OP Sepolia |
| JPM | JPMorgan Chase & Co. | [`jpm.median.eth`](https://sepolia.app.ens.domains/jpm.median.eth) | `0x51Cb9012AE16812586c7c9D6B6D13103124873D1` | OP Sepolia |





