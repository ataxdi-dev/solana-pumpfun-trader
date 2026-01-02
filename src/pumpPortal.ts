import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import axios from 'axios';

const PUMP_PORTAL_API = 'https://pumpportal.fun/api/trade-local';

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

const defaultLogger: Logger = {
  debug: () => {},
  info: console.log,
  warn: console.warn,
  error: console.error,
};

let logger: Logger = defaultLogger;

export function setLogger(customLogger: Logger): void {
  logger = customLogger;
}

/**
 * Buy token using PumpPortal API
 */
export async function buyViaPumpPortal(
  connection: Connection,
  wallet: Keypair,
  tokenMint: string,
  solAmount: number,
  slippagePercent: number = 5,
  priorityFee: number = 0.005
): Promise<string | null> {
  try {
    logger.info(`Using PumpPortal API to buy ${solAmount} SOL worth of ${tokenMint.substring(0, 8)}...`);
    
    let validTokenMint: string;
    try {
      const pubkey = new PublicKey(tokenMint);
      validTokenMint = pubkey.toBase58();
    } catch (error: any) {
      logger.error(`Invalid token mint address: ${tokenMint} - ${error.message}`);
      return null;
    }

    const amountInLamports = Math.floor(solAmount * 1e9);

    const requestData = {
      publicKey: wallet.publicKey.toBase58(),
      action: 'buy',
      mint: validTokenMint,
      amount: amountInLamports.toString(),
      denominatedInSol: 'true',
      slippage: slippagePercent,
      priorityFee: priorityFee,
      pool: 'pump',
    };

    logger.debug(`PumpPortal API request:`, requestData);

    const response = await axios.post(
      PUMP_PORTAL_API,
      requestData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        responseType: 'arraybuffer',
        timeout: 10000,
      }
    );

    if (!response.data || response.data.length === 0) {
      logger.error(`Empty response from PumpPortal API`);
      return null;
    }

    logger.info(`Received transaction from PumpPortal API (${response.data.length} bytes)`);

    const transactionBuffer = Buffer.from(response.data);
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    transaction.sign([wallet]);

    logger.info(`Sending PumpPortal transaction...`);
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    logger.info(`Transaction sent: ${signature}`);

    const latestBlockhash = await connection.getLatestBlockhash('finalized');
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, 'confirmed');

    if (confirmation.value.err) {
      logger.error(`Transaction failed: ${confirmation.value.err}`);
      return null;
    }

    logger.info(`BUY SUCCESSFUL via PumpPortal: ${signature}`);
    logger.info(`Transaction: https://solscan.io/tx/${signature}`);
    return signature;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      logger.error(`PumpPortal API error: ${status}`);
      
      if (error.response.data) {
        try {
          const errorText = Buffer.from(error.response.data).toString('utf-8');
          logger.error(`Error details: ${errorText}`);
          
          if (errorText.includes('bonding curve') || errorText.includes('migrated') || errorText.includes('does not exist')) {
            logger.warn(`Token ${tokenMint.substring(0, 8)}... has migrated or does not exist on pump.fun bonding curve`);
            return null;
          }
        } catch {
          logger.error(`Error response: ${error.response.data}`);
        }
      }
      
      if (status === 400) {
        logger.warn(`Invalid token or request parameters for ${tokenMint.substring(0, 8)}...`);
      }
    } else if (error.message) {
      logger.error(`PumpPortal buy error: ${error.message}`);
      
      if (error.message.includes('NotEnoughTokensToBuy') || error.message.includes('Not enough tokens')) {
        logger.error(`BONDING CURVE ERROR`);
        logger.error(`Token ${tokenMint.substring(0, 8)}... bonding curve has insufficient tokens`);
        logger.error(`Possible reasons:`);
        logger.error(`  1. Token bonding curve is almost empty (most tokens sold)`);
        logger.error(`  2. Token has migrated/launched (bonding curve completed)`);
        logger.error(`  3. Amount requested is too large for available tokens`);
      }
      
      if (error.logs && Array.isArray(error.logs)) {
        logger.error(`Transaction Logs:`);
        error.logs.forEach((log: string) => {
          if (log.includes('NotEnoughTokensToBuy') || log.includes('Not enough tokens')) {
            logger.error(`  ${log}`);
          } else if (log.includes('Left:') || log.includes('Right:')) {
            logger.error(`  ${log}`);
          } else {
            logger.debug(`  ${log}`);
          }
        });
      }
    } else {
      logger.error(`PumpPortal buy error: ${error.toString()}`);
    }
    return null;
  }
}

/**
 * Sell token using PumpPortal API
 */
export async function sellViaPumpPortal(
  connection: Connection,
  wallet: Keypair,
  tokenMint: string,
  tokenAmount: number,
  slippagePercent: number = 5,
  priorityFee: number = 0.005
): Promise<string | null> {
  try {
    logger.info(`Using PumpPortal API to sell ${tokenAmount} tokens of ${tokenMint.substring(0, 8)}...`);
    
    let validTokenMint: string;
    try {
      const pubkey = new PublicKey(tokenMint);
      validTokenMint = pubkey.toBase58();
    } catch (error: any) {
      logger.error(`Invalid token mint address: ${tokenMint} - ${error.message}`);
      return null;
    }

    const params = new URLSearchParams();
    params.append('publicKey', wallet.publicKey.toBase58());
    params.append('action', 'sell');
    params.append('mint', validTokenMint);
    params.append('amount', tokenAmount.toString());
    params.append('denominatedInSol', 'false');
    params.append('slippage', slippagePercent.toString());
    params.append('priorityFee', priorityFee.toString());
    params.append('pool', 'pump');

    logger.debug(`PumpPortal API request: ${params.toString()}`);

    const response = await axios.post(
      PUMP_PORTAL_API,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        responseType: 'arraybuffer',
        timeout: 10000,
      }
    );

    if (!response.data || response.data.length === 0) {
      logger.error(`Empty response from PumpPortal API`);
      return null;
    }

    logger.info(`Received transaction from PumpPortal API (${response.data.length} bytes)`);

    const transactionBuffer = Buffer.from(response.data);
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    transaction.sign([wallet]);

    logger.info(`Sending PumpPortal transaction...`);
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    logger.info(`Transaction sent: ${signature}`);

    const latestBlockhash = await connection.getLatestBlockhash('finalized');
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, 'confirmed');

    if (confirmation.value.err) {
      logger.error(`Transaction failed: ${confirmation.value.err}`);
      return null;
    }

    logger.info(`SELL SUCCESSFUL via PumpPortal: ${signature}`);
    logger.info(`Transaction: https://solscan.io/tx/${signature}`);
    return signature;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      logger.error(`PumpPortal API error: ${status}`);
      
      if (error.response.data) {
        try {
          const errorText = Buffer.from(error.response.data).toString('utf-8');
          logger.error(`Error details: ${errorText}`);
          
          if (errorText.includes('bonding curve') || errorText.includes('migrated') || errorText.includes('does not exist')) {
            logger.warn(`Token ${tokenMint.substring(0, 8)}... has migrated or does not exist on pump.fun bonding curve`);
            return null;
          }
        } catch {
          logger.error(`Error response: ${error.response.data}`);
        }
      }
      
      if (status === 400) {
        logger.warn(`Invalid token or request parameters for ${tokenMint.substring(0, 8)}...`);
      }
    } else if (error.message) {
      logger.error(`PumpPortal sell error: ${error.message}`);
    } else {
      logger.error(`PumpPortal sell error: ${error.toString()}`);
    }
    return null;
  }
}
