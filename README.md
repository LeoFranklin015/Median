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

| Contract | ENS Name | Address | Chain |
|----------|----------|---------|-------|
| Deposit | `deposit.median.eth` | `0x...` | Base |
| Deposit | `deposit.median.eth` | `0x...` | Arbitrum |
| Deposit | `deposit.median.eth` | `0x...` | Optimism |
| Trading Engine | `trading.median.eth` | `0x...` | — |
| Settlement | `settlement.median.eth` | `0x...` | — |
| Resolver | `resolver.median.eth` | `0x...` | — |


