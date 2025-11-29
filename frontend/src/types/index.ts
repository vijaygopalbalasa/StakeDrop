/**
 * StakeDrop Frontend Types
 */

// Pool status enum
export enum PoolStatus {
  Collecting = 'Collecting',
  Staking = 'Staking',
  Distributing = 'Distributing',
  Completed = 'Completed',
}

// Pool state
export interface PoolState {
  epochId: number;
  status: PoolStatus;
  totalDeposited: bigint;
  participantCount: number;
  yieldAmount: bigint;
  epochEnd: Date;
  winnerCommitment: string | null;
}

// User deposit secret (stored locally)
export interface DepositSecret {
  secret: string;
  amount: string;
  commitment: string;
  createdAt: string;
  epochId: number;
}

// Wallet connection state
export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: bigint;
  network: 'preview' | 'preprod' | 'mainnet';
}

// Transaction result
export interface TransactionResult {
  success: boolean;
  txHash: string;
  message: string;
}

// Withdrawal claim
export interface WithdrawalClaim {
  commitment: string;
  isWinner: boolean;
  principalAmount: bigint;
  yieldAmount: bigint;
  totalAmount: bigint;
}
