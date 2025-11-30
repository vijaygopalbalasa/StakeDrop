/**
 * Blockchain Service
 * Handles real blockchain interactions for StakeDrop
 * - Query UTxOs at script address
 * - Parse inline datums
 * - Get pool state from chain
 */

import {
  getPoolScriptAddress,
  getPoolValidator,
  PoolDatum,
  PoolStatus,
  CARDANO_NETWORK,
  POOL_VALIDATOR_CBOR,
} from './contract';
import { LOVELACE_PER_ADA } from './constants';

// ============================================
// Types
// ============================================

export interface BlockchainUTxO {
  tx_hash: string;
  tx_index: number;
  output_index: number;
  amount: Array<{
    unit: string;
    quantity: string;
  }>;
  block: string;
  data_hash: string | null;
  inline_datum: string | null;
  reference_script_hash: string | null;
}

export interface PoolStateFromChain {
  utxo: BlockchainUTxO;
  datum: PoolDatum;
  lovelaceValue: bigint;
  isValid: boolean;
}

export interface EpochInfo {
  epoch: number;
  start_time: number;
  end_time: number;
  first_block_time: number;
  last_block_time: number;
  block_count: number;
  tx_count: number;
}

// ============================================
// Configuration
// ============================================

const BLOCKFROST_PROJECT_ID = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || '';

const BLOCKFROST_URLS: Record<string, string> = {
  mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  preview: 'https://cardano-preview.blockfrost.io/api/v0',
  preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
};

const BASE_URL = BLOCKFROST_URLS[CARDANO_NETWORK] || BLOCKFROST_URLS.preview;

// ============================================
// API Helpers
// ============================================

async function blockfrostFetch<T>(endpoint: string): Promise<T> {
  if (!BLOCKFROST_PROJECT_ID) {
    throw new Error('Blockfrost API key not configured. Set NEXT_PUBLIC_BLOCKFROST_PROJECT_ID');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'project_id': BLOCKFROST_PROJECT_ID,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Resource not found');
    }
    const errorBody = await response.text();
    throw new Error(`Blockfrost API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

// ============================================
// CBOR Datum Parsing
// ============================================

/**
 * Parse CBOR-encoded inline datum to PoolDatum
 * This is a simplified parser - in production use @meshsdk/core Data utilities
 */
export function parseInlineDatum(cborHex: string): PoolDatum | null {
  try {
    // For now, we'll use a simplified approach
    // In production, use: import { Data } from '@meshsdk/core';
    // const decoded = Data.fromCbor(cborHex);

    // This is a placeholder that returns default values
    // Real implementation needs CBOR parsing
    console.log('Parsing datum CBOR:', cborHex.slice(0, 50) + '...');

    // TODO: Implement proper CBOR parsing
    // For hackathon demo, we'll combine with localStorage
    return null;
  } catch (error) {
    console.error('Failed to parse inline datum:', error);
    return null;
  }
}

/**
 * Parse datum fields from decoded CBOR structure
 */
export function datumFromFields(fields: any[]): PoolDatum {
  return {
    admin: fields[0] as string,
    epochId: Number(fields[1]),
    epochEnd: Number(fields[2]),
    totalDeposited: BigInt(fields[3]),
    participantCount: Number(fields[4]),
    midnightRoot: fields[5] as string,
    status: Number(fields[6]?.index ?? fields[6]) as PoolStatus,
    stakePoolId: fields[7] as string,
    yieldAmount: BigInt(fields[8]),
    winnerCommitment: fields[9] as string,
    withdrawalCount: Number(fields[10]),
    winnerWithdrawn: fields[11]?.index === 1 || fields[11] === true,
    withdrawnCommitments: (fields[12] || []) as string[],
  };
}

// ============================================
// Pool State Queries
// ============================================

/**
 * Fetch all UTxOs at the pool script address
 */
export async function fetchPoolUTxOs(): Promise<BlockchainUTxO[]> {
  const scriptAddress = getPoolScriptAddress();

  try {
    const utxos = await blockfrostFetch<BlockchainUTxO[]>(
      `/addresses/${scriptAddress}/utxos`
    );
    return utxos;
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      // No UTxOs at address yet (pool not initialized)
      return [];
    }
    throw error;
  }
}

/**
 * Get the current pool state from the blockchain
 * Returns the pool UTxO with parsed datum
 */
export async function getPoolStateFromChain(): Promise<PoolStateFromChain | null> {
  try {
    const utxos = await fetchPoolUTxOs();

    if (utxos.length === 0) {
      console.log('No pool UTxO found at script address');
      return null;
    }

    // Find the UTxO with inline datum (the pool state)
    const poolUtxo = utxos.find(u => u.inline_datum !== null);

    if (!poolUtxo) {
      console.log('No UTxO with inline datum found');
      return null;
    }

    // Parse the inline datum
    const datum = parseInlineDatum(poolUtxo.inline_datum!);

    // Get lovelace value
    const lovelace = poolUtxo.amount.find(a => a.unit === 'lovelace');
    const lovelaceValue = BigInt(lovelace?.quantity || '0');

    return {
      utxo: poolUtxo,
      datum: datum || createDefaultDatum(),
      lovelaceValue,
      isValid: datum !== null,
    };
  } catch (error) {
    console.error('Failed to fetch pool state from chain:', error);
    return null;
  }
}

/**
 * Create a default/empty pool datum for when chain data isn't available
 */
function createDefaultDatum(): PoolDatum {
  return {
    admin: '',
    epochId: 0,
    epochEnd: Date.now() + 5 * 24 * 60 * 60 * 1000,
    totalDeposited: BigInt(0),
    participantCount: 0,
    midnightRoot: '',
    status: PoolStatus.Collecting,
    stakePoolId: '',
    yieldAmount: BigInt(0),
    winnerCommitment: '',
    withdrawalCount: 0,
    winnerWithdrawn: false,
    withdrawnCommitments: [],
  };
}

/**
 * Get pool statistics from blockchain
 */
export async function getPoolStats(): Promise<{
  totalDeposited: bigint;
  participantCount: number;
  poolValue: bigint;
  status: string;
}> {
  const poolState = await getPoolStateFromChain();

  if (!poolState) {
    return {
      totalDeposited: BigInt(0),
      participantCount: 0,
      poolValue: BigInt(0),
      status: 'Not Initialized',
    };
  }

  const statusNames = ['Collecting', 'Staking', 'Distributing', 'Completed'];

  return {
    totalDeposited: poolState.datum.totalDeposited,
    participantCount: poolState.datum.participantCount,
    poolValue: poolState.lovelaceValue,
    status: statusNames[poolState.datum.status] || 'Unknown',
  };
}

// ============================================
// Epoch Queries
// ============================================

/**
 * Get current Cardano epoch info
 */
export async function getCurrentEpoch(): Promise<EpochInfo> {
  return blockfrostFetch<EpochInfo>('/epochs/latest');
}

/**
 * Calculate time remaining in current epoch
 */
export async function getEpochTimeRemaining(): Promise<{
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}> {
  const epochInfo = await getCurrentEpoch();
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, epochInfo.end_time - now);

  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  };
}

// ============================================
// Address Queries
// ============================================

/**
 * Get UTxOs for a specific address (e.g., user's wallet)
 */
export async function getAddressUTxOs(address: string): Promise<BlockchainUTxO[]> {
  try {
    return await blockfrostFetch<BlockchainUTxO[]>(`/addresses/${address}/utxos`);
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get ADA balance for an address
 */
export async function getAddressBalance(address: string): Promise<bigint> {
  try {
    const info = await blockfrostFetch<{
      amount: Array<{ unit: string; quantity: string }>;
    }>(`/addresses/${address}`);

    const lovelace = info.amount.find(a => a.unit === 'lovelace');
    return BigInt(lovelace?.quantity || '0');
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return BigInt(0);
    }
    throw error;
  }
}

// ============================================
// Transaction Queries
// ============================================

/**
 * Get transaction details
 */
export async function getTransaction(txHash: string): Promise<any> {
  return blockfrostFetch(`/txs/${txHash}`);
}

/**
 * Get transaction UTxOs (inputs and outputs)
 */
export async function getTransactionUTxOs(txHash: string): Promise<{
  inputs: any[];
  outputs: any[];
}> {
  return blockfrostFetch(`/txs/${txHash}/utxos`);
}

/**
 * Wait for transaction confirmation
 */
export async function waitForConfirmation(
  txHash: string,
  maxAttempts: number = 60,
  delayMs: number = 5000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await getTransaction(txHash);
      return true; // Transaction found = confirmed
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        // Not yet confirmed, wait and retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  return false; // Timeout
}

// ============================================
// Explorer URLs
// ============================================

const EXPLORER_URLS: Record<string, string> = {
  mainnet: 'https://cardanoscan.io',
  preview: 'https://preview.cardanoscan.io',
  preprod: 'https://preprod.cardanoscan.io',
};

export function getExplorerUrl(type: 'tx' | 'address', value: string): string {
  const baseUrl = EXPLORER_URLS[CARDANO_NETWORK] || EXPLORER_URLS.preview;
  const path = type === 'tx' ? 'transaction' : 'address';
  return `${baseUrl}/${path}/${value}`;
}

export function getTxExplorerUrl(txHash: string): string {
  return getExplorerUrl('tx', txHash);
}

export function getAddressExplorerUrl(address: string): string {
  return getExplorerUrl('address', address);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if Blockfrost is properly configured
 */
export function isBlockfrostConfigured(): boolean {
  return !!BLOCKFROST_PROJECT_ID && BLOCKFROST_PROJECT_ID.length > 10;
}

/**
 * Get the script address for display
 */
export function getScriptAddressDisplay(): string {
  const addr = getPoolScriptAddress();
  return `${addr.slice(0, 20)}...${addr.slice(-10)}`;
}

/**
 * Format lovelace to ADA string
 */
export function lovelaceToAda(lovelace: bigint): string {
  const ada = Number(lovelace) / LOVELACE_PER_ADA;
  return ada.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

// ============================================
// On-Chain Deposit & Commitment Functions
// ============================================

export interface OnChainDeposit {
  txHash: string;
  commitment: string;
  amount: bigint;
  epoch: number;
  timestamp: number;
  blockHeight: number;
}

/**
 * Get transactions to the script address
 */
export async function getScriptAddressTransactions(
  count: number = 100
): Promise<Array<{ tx_hash: string; block_height: number; block_time: number }>> {
  const scriptAddress = getPoolScriptAddress();
  try {
    return await blockfrostFetch<Array<{ tx_hash: string; block_height: number; block_time: number }>>(
      `/addresses/${scriptAddress}/transactions?count=${count}&order=desc`
    );
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get transaction metadata
 */
export async function getTransactionMetadata(txHash: string): Promise<any[]> {
  try {
    return await blockfrostFetch<any[]>(`/txs/${txHash}/metadata`);
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return [];
    }
    throw error;
  }
}

/**
 * Fetch all deposits from blockchain by querying transaction metadata
 * This reads the commitment from CIP-20 metadata (label 674)
 */
export async function fetchDepositsFromBlockchain(): Promise<OnChainDeposit[]> {
  const deposits: OnChainDeposit[] = [];

  try {
    // Get recent transactions to the script address
    const transactions = await getScriptAddressTransactions(100);

    // Fetch metadata for each transaction
    for (const tx of transactions) {
      try {
        const metadata = await getTransactionMetadata(tx.tx_hash);

        // Look for StakeDrop metadata (label 674)
        const stakeDropMeta = metadata.find(m => m.label === '674');

        if (stakeDropMeta && stakeDropMeta.json_metadata) {
          const meta = stakeDropMeta.json_metadata;

          // Check if this is a StakeDrop deposit (has commitment and msg contains 'Deposit')
          if (meta.commitment && meta.msg && Array.isArray(meta.msg) &&
              meta.msg.some((m: string) => m.includes('Deposit'))) {

            // Get the transaction details for the amount
            const txUtxos = await getTransactionUTxOs(tx.tx_hash);
            const scriptAddress = getPoolScriptAddress();

            // Find the output to the script address
            const scriptOutput = txUtxos.outputs.find(
              (o: any) => o.address === scriptAddress
            );

            const amount = scriptOutput
              ? BigInt(scriptOutput.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0')
              : BigInt(0);

            deposits.push({
              txHash: tx.tx_hash,
              commitment: meta.commitment,
              amount,
              epoch: meta.epoch || 0,
              timestamp: tx.block_time * 1000,
              blockHeight: tx.block_height,
            });
          }
        }
      } catch (metaError) {
        // Skip transactions without metadata or with errors
        console.warn(`Failed to get metadata for tx ${tx.tx_hash}:`, metaError);
      }
    }

    return deposits;
  } catch (error) {
    console.error('Failed to fetch deposits from blockchain:', error);
    return [];
  }
}

/**
 * Get all unique commitments from blockchain deposits
 */
export async function getCommitmentsFromBlockchain(): Promise<string[]> {
  const deposits = await fetchDepositsFromBlockchain();
  // Return unique commitments
  return [...new Set(deposits.map(d => d.commitment))];
}

/**
 * Check if a commitment exists on-chain
 */
export async function isCommitmentOnChain(commitment: string): Promise<boolean> {
  const commitments = await getCommitmentsFromBlockchain();
  return commitments.includes(commitment);
}
