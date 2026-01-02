# solana-pumpfun-trader

Pump.fun trading SDK for Solana blockchain. Buy and sell tokens on Pump.fun bonding curve using the PumpPortal API.

## Features

- Buy tokens on Pump.fun bonding curve
- Sell tokens on Pump.fun bonding curve
- Supports custom slippage and priority fees
- TypeScript support
- Error handling for bonding curve states

## Installation

```bash
npm install solana-pumpfun-trader
```

## Configuration

This package requires:
1. **Solana RPC endpoint** - Use environment variable
2. **Wallet private key** - Store securely, use environment variable

**Important:** Never hardcode private keys or RPC URLs in your code!

```bash
# .env file
RPC_URL=https://api.mainnet-beta.solana.com
PRIVATE_KEY=your_base58_encoded_private_key_here
```

```typescript
import dotenv from 'dotenv';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY not set in environment variables');
}

const wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
```

## Usage

### Buy Token

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { buyViaPumpPortal } from 'solana-pumpfun-trader';
import dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required');
}

const connection = new Connection(RPC_URL);
const wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

const signature = await buyViaPumpPortal(
  connection,
  wallet,
  'TokenMintAddress...',
  0.01, // 0.01 SOL
  5,    // 5% slippage
  0.005 // 0.005 SOL priority fee
);

if (signature) {
  console.log('Buy successful:', signature);
}
```

### Sell Token

```typescript
import { sellViaPumpPortal } from 'solana-pumpfun-trader';
// ... (connection and wallet setup as above)

const signature = await sellViaPumpPortal(
  connection,
  wallet,
  'TokenMintAddress...',
  1000000, // Token amount (Pump.fun tokens have 6 decimals)
  5,       // 5% slippage
  0.005    // 0.005 SOL priority fee
);

if (signature) {
  console.log('Sell successful:', signature);
}
```

### Custom Logger

```typescript
import { setLogger } from 'solana-pumpfun-trader';

setLogger({
  debug: (msg) => console.debug(msg),
  info: (msg) => console.info(msg),
  warn: (msg) => console.warn(msg),
  error: (msg) => console.error(msg),
});
```

## API

### `buyViaPumpPortal(connection, wallet, tokenMint, solAmount, slippagePercent?, priorityFee?): Promise<string | null>`

Buy tokens on Pump.fun bonding curve.

**Parameters:**
- `connection: Connection` - Solana Connection instance
- `wallet: Keypair` - Wallet keypair
- `tokenMint: string` - Token mint address
- `solAmount: number` - Amount in SOL to spend
- `slippagePercent: number` - Slippage percentage (default: 5)
- `priorityFee: number` - Priority fee in SOL (default: 0.005)

**Returns:**
- `Promise<string | null>` - Transaction signature on success, null on failure

### `sellViaPumpPortal(connection, wallet, tokenMint, tokenAmount, slippagePercent?, priorityFee?): Promise<string | null>`

Sell tokens on Pump.fun bonding curve.

**Parameters:**
- `connection: Connection` - Solana Connection instance
- `wallet: Keypair` - Wallet keypair
- `tokenMint: string` - Token mint address
- `tokenAmount: number` - Token amount to sell (raw amount with decimals)
- `slippagePercent: number` - Slippage percentage (default: 5)
- `priorityFee: number` - Priority fee in SOL (default: 0.005)

**Returns:**
- `Promise<string | null>` - Transaction signature on success, null on failure

## Environment Variables

Required environment variables:

- `RPC_URL` - Solana RPC endpoint (default: `https://api.mainnet-beta.solana.com`)
- `PRIVATE_KEY` - Your wallet private key (base58 encoded) - **REQUIRED for trading**

**Security Warning:**
- Never commit `.env` files to git
- Never share your private key
- Use a dedicated trading wallet with limited funds
- Use environment variables or secure secret management

## Notes

- Pump.fun tokens use 6 decimals
- Token must still be on bonding curve (not migrated to Raydium)
- Uses PumpPortal API for transaction building
- Automatically handles transaction signing and confirmation
- Always use a private RPC endpoint for production (public RPCs are rate-limited)

## Error Handling

Common errors:
- `NotEnoughTokensToBuy` - Bonding curve has insufficient tokens (try smaller amount)
- `BondingCurveComplete` - Token has migrated to Raydium (cannot trade on bonding curve)
- `Invalid token` - Token mint address is invalid or token doesn't exist

## License

MIT
