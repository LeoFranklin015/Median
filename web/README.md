# Circle Modular Wallet with Dynamic Integration

This project integrates Circle's Modular Wallets SDK with Dynamic for seamless Web3 authentication and smart account management.

## Features

- **Dynamic Wallet Integration**: Connect wallets using Dynamic's authentication system
- **Circle Smart Accounts**: Automatic smart account creation with ERC-4337 support
- **Gas Sponsorship**: Built-in paymaster support for gasless transactions
- **Type-Safe**: Full TypeScript support with viem integration

## Setup

1. Install dependencies:
```bash
bun install
```

2. Environment variables are already configured in `.env`:
   - `NEXT_PUBLIC_CIRCLE_CLIENT_KEY`: Circle API client key
   - `NEXT_PUBLIC_CIRCLE_CLIENT_URL`: Circle RPC URL
   - `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`: Dynamic environment ID

## Development

Run the development server:
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
web/
├── app/
│   ├── layout.tsx          # Root layout with DynamicProvider
│   ├── page.tsx            # Home page with ConnectWallet
│   └── globals.css         # Global styles
├── components/
│   ├── ConnectWallet.tsx   # Main wallet connection component
│   └── providers/
│       └── DynamicProvider.tsx  # Dynamic context provider
├── lib/
│   └── circle-utils.ts     # Circle SDK utility functions
└── .env                    # Environment variables
```

## How It Works

1. **Connect Wallet**: Users connect their wallet through Dynamic's authentication
2. **Smart Account Creation**: Once connected, a Circle Smart Account is automatically created
3. **Transaction Execution**: Send user operations with gas sponsorship through the smart account

## Key Components

### ConnectWallet Component

The main component ([components/ConnectWallet.tsx](components/ConnectWallet.tsx)) handles:
- Wallet connection via Dynamic
- Smart account initialization
- Display of smart account address
- Error handling and loading states

### DynamicProvider

Wraps the application with Dynamic's context ([components/providers/DynamicProvider.tsx](components/providers/DynamicProvider.tsx)):
- Configures Dynamic SDK with environment ID
- Enables Ethereum wallet connectors
- Provides wallet context to child components

### Circle Utils

Helper functions for Circle SDK integration ([lib/circle-utils.ts](lib/circle-utils.ts)):
- Client creation with modular transport
- Smart account conversion from wallet client
- Configuration management

## Next Steps

To send transactions with your smart account:

1. Import the utilities:
```typescript
import { createSmartAccountFromWallet, getCircleConfig } from '@/lib/circle-utils';
```

2. Create a bundler client and send user operations:
```typescript
const { smartAccount, client } = await createSmartAccountFromWallet(
  walletClient,
  getCircleConfig()
);

// Send transaction with gas sponsorship
const opHash = await bundlerClient.sendUserOperation({
  account: smartAccount,
  calls: [callData],
  paymaster: true,
});
```

## Resources

- [Circle Modular Wallets Documentation](https://developers.circle.com/wallets/modular/web-sdk)
- [Dynamic Documentation](https://docs.dynamic.xyz/)
- [Viem Documentation](https://viem.sh/)

## Technologies

- **Next.js 16**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Circle Modular SDK**: Smart account management
- **Dynamic SDK**: Wallet authentication
- **Viem**: Ethereum interactions
