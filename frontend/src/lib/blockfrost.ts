/**
 * Blockfrost API Service
 * Fetches real blockchain data from Cardano network
 */

const BLOCKFROST_PROJECT_ID = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || '';
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'preview';

// Blockfrost API base URLs
const BLOCKFROST_URLS: Record<string, string> = {
  mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  preview: 'https://cardano-preview.blockfrost.io/api/v0',
  preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
};

const BASE_URL = BLOCKFROST_URLS[NETWORK] || BLOCKFROST_URLS.preview;

// Types for Blockfrost responses
export interface EpochInfo {
  epoch: number;
  start_time: number;
  end_time: number;
  first_block_time: number;
  last_block_time: number;
  block_count: number;
  tx_count: number;
  output: string;
  fees: string;
  active_stake: string;
}

export interface PoolInfo {
  pool_id: string;
  hex: string;
  vrf_key: string;
  blocks_minted: number;
  blocks_epoch: number;
  live_stake: string;
  live_size: number;
  live_saturation: number;
  live_delegators: number;
  active_stake: string;
  active_size: number;
  declared_pledge: string;
  live_pledge: string;
  margin_cost: number;
  fixed_cost: string;
  reward_account: string;
  owners: string[];
  registration: string[];
  retirement: string[];
}

export interface PoolMetadata {
  pool_id: string;
  hex: string;
  url: string;
  hash: string;
  ticker: string;
  name: string;
  description: string;
  homepage: string;
}

export interface AddressInfo {
  address: string;
  amount: Array<{
    unit: string;
    quantity: string;
  }>;
  stake_address: string | null;
  type: string;
  script: boolean;
}

export interface ProtocolParameters {
  epoch: number;
  min_fee_a: number;
  min_fee_b: number;
  max_block_size: number;
  max_tx_size: number;
  max_block_header_size: number;
  key_deposit: string;
  pool_deposit: string;
  e_max: number;
  n_opt: number;
  a0: number;
  rho: number;
  tau: number;
  decentralisation_param: number;
  extra_entropy: null;
  protocol_major_ver: number;
  protocol_minor_ver: number;
  min_utxo: string;
  min_pool_cost: string;
  nonce: string;
  cost_models: Record<string, Record<string, number>>;
  price_mem: number;
  price_step: number;
  max_tx_ex_mem: string;
  max_tx_ex_steps: string;
  max_block_ex_mem: string;
  max_block_ex_steps: string;
  max_val_size: string;
  collateral_percent: number;
  max_collateral_inputs: number;
  coins_per_utxo_size: string;
  coins_per_utxo_word: string;
}

export interface UTXO {
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

// API Error class
export class BlockfrostError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'BlockfrostError';
  }
}

// Generic fetch function with error handling
async function blockfrostFetch<T>(endpoint: string): Promise<T> {
  if (!BLOCKFROST_PROJECT_ID) {
    throw new BlockfrostError(
      'Blockfrost project ID not configured',
      500,
      'Configuration Error'
    );
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'project_id': BLOCKFROST_PROJECT_ID,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new BlockfrostError(
      `Blockfrost API error: ${errorBody}`,
      response.status,
      response.statusText
    );
  }

  return response.json();
}

// ============ Epoch Functions ============

/**
 * Get current epoch information
 */
export async function getCurrentEpoch(): Promise<EpochInfo> {
  return blockfrostFetch<EpochInfo>('/epochs/latest');
}

/**
 * Get specific epoch information
 */
export async function getEpoch(epochNumber: number): Promise<EpochInfo> {
  return blockfrostFetch<EpochInfo>(`/epochs/${epochNumber}`);
}

/**
 * Get epoch parameters (for fee calculation)
 */
export async function getProtocolParameters(): Promise<ProtocolParameters> {
  return blockfrostFetch<ProtocolParameters>('/epochs/latest/parameters');
}

// ============ Pool Functions ============

/**
 * Get list of all stake pools
 */
export async function getStakePools(page: number = 1, count: number = 10): Promise<string[]> {
  return blockfrostFetch<string[]>(`/pools?page=${page}&count=${count}`);
}

/**
 * Get detailed pool information
 */
export async function getPoolInfo(poolId: string): Promise<PoolInfo> {
  return blockfrostFetch<PoolInfo>(`/pools/${poolId}`);
}

/**
 * Get pool metadata (name, ticker, etc.)
 */
export async function getPoolMetadata(poolId: string): Promise<PoolMetadata | null> {
  try {
    return await blockfrostFetch<PoolMetadata>(`/pools/${poolId}/metadata`);
  } catch (error) {
    // Pool might not have metadata registered
    return null;
  }
}

/**
 * Get extended pool info including metadata
 */
export async function getPoolWithMetadata(poolId: string): Promise<{
  info: PoolInfo;
  metadata: PoolMetadata | null;
}> {
  const [info, metadata] = await Promise.all([
    getPoolInfo(poolId),
    getPoolMetadata(poolId),
  ]);
  return { info, metadata };
}

// ============ Address Functions ============

/**
 * Get address information including balance
 */
export async function getAddressInfo(address: string): Promise<AddressInfo> {
  return blockfrostFetch<AddressInfo>(`/addresses/${address}`);
}

/**
 * Get UTXOs for an address
 */
export async function getAddressUtxos(address: string): Promise<UTXO[]> {
  try {
    return await blockfrostFetch<UTXO[]>(`/addresses/${address}/utxos`);
  } catch (error) {
    // Address might have no UTXOs
    if (error instanceof BlockfrostError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Get total ADA balance for an address (in lovelace)
 */
export async function getAddressBalance(address: string): Promise<bigint> {
  try {
    const info = await getAddressInfo(address);
    const lovelace = info.amount.find(a => a.unit === 'lovelace');
    return BigInt(lovelace?.quantity || '0');
  } catch (error) {
    if (error instanceof BlockfrostError && error.status === 404) {
      return BigInt(0);
    }
    throw error;
  }
}

// ============ Transaction Functions ============

/**
 * Submit a signed transaction
 */
export async function submitTransaction(signedTxCbor: string): Promise<string> {
  if (!BLOCKFROST_PROJECT_ID) {
    throw new BlockfrostError(
      'Blockfrost project ID not configured',
      500,
      'Configuration Error'
    );
  }

  const response = await fetch(`${BASE_URL}/tx/submit`, {
    method: 'POST',
    headers: {
      'project_id': BLOCKFROST_PROJECT_ID,
      'Content-Type': 'application/cbor',
    },
    body: Buffer.from(signedTxCbor, 'hex'),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new BlockfrostError(
      `Transaction submission failed: ${errorBody}`,
      response.status,
      response.statusText
    );
  }

  // Returns transaction hash
  return response.text();
}

/**
 * Get transaction details
 */
export async function getTransaction(txHash: string): Promise<any> {
  return blockfrostFetch<any>(`/txs/${txHash}`);
}

// ============ Utility Functions ============

/**
 * Calculate time remaining until epoch ends
 */
export function getEpochTimeRemaining(epochInfo: EpochInfo): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, epochInfo.end_time - now);

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return { days, hours, minutes, seconds, totalSeconds: remaining };
}

/**
 * Format lovelace to ADA
 */
export function lovelaceToAda(lovelace: bigint | string): number {
  const value = typeof lovelace === 'string' ? BigInt(lovelace) : lovelace;
  return Number(value) / 1_000_000;
}

/**
 * Format ADA to lovelace
 */
export function adaToLovelace(ada: number): bigint {
  return BigInt(Math.floor(ada * 1_000_000));
}

/**
 * Check if Blockfrost is configured
 */
export function isBlockfrostConfigured(): boolean {
  return !!BLOCKFROST_PROJECT_ID && BLOCKFROST_PROJECT_ID !== 'previewXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
}

/**
 * Get network info
 */
export function getNetworkInfo() {
  return {
    network: NETWORK,
    baseUrl: BASE_URL,
    isConfigured: isBlockfrostConfigured(),
  };
}
