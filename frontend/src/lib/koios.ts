/**
 * Koios API Service - Alternative to Blockfrost
 * Free, no API key required
 */

const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'preview';

// Koios API base URLs
const KOIOS_URLS: Record<string, string> = {
  mainnet: 'https://api.koios.rest/api/v1',
  preview: 'https://preview.koios.rest/api/v1',
  preprod: 'https://preprod.koios.rest/api/v1',
};

const BASE_URL = KOIOS_URLS[NETWORK] || KOIOS_URLS.preview;

export interface KoiosTip {
  hash: string;
  epoch_no: number;
  abs_slot: number;
  epoch_slot: number;
  block_height: number;
  block_no: number;
  block_time: number;
}

export interface KoiosEpochInfo {
  epoch_no: number;
  out_sum: string;
  fees: string;
  tx_count: number;
  blk_count: number;
  start_time: number;
  end_time: number;
  first_block_time: number;
  last_block_time: number;
  active_stake: string;
  total_rewards: string;
  avg_blk_reward: string;
}

export interface KoiosAddressInfo {
  address: string;
  balance: string;
  stake_address: string | null;
  script_address: boolean;
  utxo_set: Array<{
    tx_hash: string;
    tx_index: number;
    value: string;
    datum_hash: string | null;
    inline_datum: any | null;
    reference_script: any | null;
    asset_list: Array<{
      policy_id: string;
      asset_name: string;
      quantity: string;
    }>;
  }>;
}

// Generic fetch function
async function koiosFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Koios API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// POST fetch for Koios endpoints that require body
async function koiosPost<T>(endpoint: string, body: object): Promise<T> {
  return koiosFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Get current blockchain tip
 */
export async function getTip(): Promise<KoiosTip> {
  const tips = await koiosFetch<KoiosTip[]>('/tip');
  return tips[0];
}

/**
 * Get current epoch info
 */
export async function getCurrentEpoch(): Promise<KoiosEpochInfo> {
  const tip = await getTip();
  const epochs = await koiosFetch<KoiosEpochInfo[]>(`/epoch_info?_epoch_no=${tip.epoch_no}`);
  return epochs[0];
}

/**
 * Get specific epoch info
 */
export async function getEpochInfo(epochNo: number): Promise<KoiosEpochInfo> {
  const epochs = await koiosFetch<KoiosEpochInfo[]>(`/epoch_info?_epoch_no=${epochNo}`);
  return epochs[0];
}

/**
 * Get address info including balance and UTXOs
 */
export async function getAddressInfo(address: string): Promise<KoiosAddressInfo | null> {
  try {
    const result = await koiosPost<KoiosAddressInfo[]>('/address_info', {
      _addresses: [address],
    });
    return result[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get address balance in lovelace
 */
export async function getAddressBalance(address: string): Promise<bigint> {
  const info = await getAddressInfo(address);
  return BigInt(info?.balance || '0');
}

/**
 * Get UTXOs for an address
 */
export async function getAddressUtxos(address: string): Promise<Array<{
  tx_hash: string;
  tx_index: number;
  value: string;
  datum_hash: string | null;
  inline_datum: any | null;
}>> {
  const info = await getAddressInfo(address);
  return info?.utxo_set || [];
}

/**
 * Submit a signed transaction
 */
export async function submitTransaction(signedTxCbor: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/submittx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/cbor',
    },
    body: Buffer.from(signedTxCbor, 'hex'),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Transaction submission failed: ${error}`);
  }

  return response.text();
}

/**
 * Calculate epoch time remaining
 */
export function getEpochTimeRemaining(epochInfo: KoiosEpochInfo): {
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

export function isKoiosConfigured(): boolean {
  return true; // Koios doesn't need API key
}

export function getNetworkInfo() {
  return {
    network: NETWORK,
    baseUrl: BASE_URL,
    isConfigured: true,
  };
}
