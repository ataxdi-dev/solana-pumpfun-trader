import { Connection, Keypair } from '@solana/web3.js';
import { buyViaPumpPortal, sellViaPumpPortal } from './src/index.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Example usage (DO NOT RUN WITHOUT SETTING ENV VARIABLES)
async function main() {
  // Use environment variables
  const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  if (!PRIVATE_KEY) {
    console.error('ERROR: PRIVATE_KEY environment variable is required!');
    console.error('');
    console.error('Create a .env file:');
    console.error('  RPC_URL=https://api.mainnet-beta.solana.com');
    console.error('  PRIVATE_KEY=your_base58_encoded_private_key');
    console.error('');
    console.error('WARNING: Never share your private key or commit .env to git!');
    process.exit(1);
  }
  
  const connection = new Connection(RPC_URL);
  const wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  
  console.log('Using RPC:', RPC_URL);
  console.log('Wallet:', wallet.publicKey.toBase58());
  console.log('');
  console.log('This is an example file.');
  console.log('To actually trade, you would use:');
  console.log('');
  console.log('  const signature = await buyViaPumpPortal(');
  console.log('    connection,');
  console.log('    wallet,');
  console.log('    tokenMint,');
  console.log('    0.01, // SOL amount');
  console.log('    5,    // slippage %');
  console.log('    0.005 // priority fee');
  console.log('  );');
}

main().catch(console.error);
