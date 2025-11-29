/**
 * StakeDrop Constants
 */

// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'preview';

// Cardano settings
export const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || '';
export const POOL_VALIDATOR_ADDRESS = process.env.NEXT_PUBLIC_POOL_VALIDATOR_ADDRESS || '';

// Midnight settings
export const MIDNIGHT_NETWORK_URL = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_URL || 'https://testnet.midnight.network';
export const MIDNIGHT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS || '';

// Pool settings
export const MIN_DEPOSIT_ADA = 10; // Minimum 10 ADA deposit
export const DEFAULT_DEPOSIT_ADA = 50; // Default deposit amount
export const MAX_PARTICIPANTS = 100;
export const EPOCH_DURATION_DAYS = 5;

// Stake pools (Preview testnet)
export const STAKE_POOLS = [
  {
    id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
    name: 'BERRY',
    ticker: 'BERRY',
  },
  {
    id: 'pool1y3s8mwd0akcceh9cl5l7u7xh46yxz5a5uq8w4e5e0mz3lfzl8xs',
    name: 'ADACT',
    ticker: 'ADACT',
  },
];

// Local storage keys
export const STORAGE_KEYS = {
  DEPOSIT_SECRETS: 'stakedrop_deposit_secrets',
  WALLET_PREFERENCE: 'stakedrop_wallet_preference',
};

// ADA conversion
export const LOVELACE_PER_ADA = 1_000_000;

export const formatAda = (lovelace: bigint | number): string => {
  const ada = Number(lovelace) / LOVELACE_PER_ADA;
  return ada.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

export const parseAda = (ada: string): bigint => {
  const parsed = parseFloat(ada);
  if (isNaN(parsed)) return BigInt(0);
  return BigInt(Math.floor(parsed * LOVELACE_PER_ADA));
};
