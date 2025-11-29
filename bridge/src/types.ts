/**
 * StakeDrop Bridge Types
 * Type definitions for cross-chain operations
 */

// 32-byte hex string
export type Commitment = string;

// Transaction hash
export type TxHash = string;

// Pool epoch status
export enum PoolStatus {
  Collecting = 'Collecting',
  Staking = 'Staking',
  Distributing = 'Distributing',
  Completed = 'Completed',
}

// Participant record
export interface Participant {
  commitment: Commitment;
  amount: bigint;
  depositedAt: Date;
  withdrawn: boolean;
}

// Pool state from Cardano
export interface CardanoPoolState {
  epochId: number;
  status: PoolStatus;
  totalDeposited: bigint;
  participantCount: number;
  yieldAmount: bigint;
  stakePoolId: string;
  winnerCommitment: Commitment | null;
}

// Pool state from Midnight
export interface MidnightPoolState {
  epochId: number;
  poolLocked: boolean;
  winnerSelected: boolean;
  participantCount: number;
  commitments: Commitment[];
  winnerCommitment: Commitment | null;
  randomnessSeed: string | null;
}

// Bridge configuration
export interface BridgeConfig {
  // Cardano settings
  cardanoNetwork: 'preview' | 'preprod' | 'mainnet';
  cardanoBlockfrostApiKey: string;
  cardanoPoolValidatorAddress: string;
  cardanoStakePoolId: string;

  // Midnight settings
  midnightNetworkUrl: string;
  midnightContractAddress: string;

  // Admin settings
  adminMnemonic: string;
}

// Staking transaction result
export interface StakingResult {
  cardanoTxHash: TxHash;
  stakedAmount: bigint;
  stakePoolId: string;
  delegationCertificate: string;
}

// Epoch finalization result
export interface FinalizationResult {
  midnightTxHash: TxHash;
  cardanoTxHash: TxHash;
  winnerCommitment: Commitment;
  totalYield: bigint;
}

// Withdrawal claim
export interface WithdrawalClaim {
  commitment: Commitment;
  isWinner: boolean;
  amount: bigint;
  yieldAmount: bigint;
  midnightProof: string;
}

// Bridge event types
export type BridgeEvent =
  | { type: 'DEPOSIT_DETECTED'; commitment: Commitment; amount: bigint }
  | { type: 'POOL_LOCKED'; participantCount: number; totalDeposited: bigint }
  | { type: 'STAKING_INITIATED'; txHash: TxHash; amount: bigint }
  | { type: 'YIELD_UPDATED'; newYield: bigint }
  | { type: 'WINNER_SELECTED'; commitment: Commitment }
  | { type: 'WITHDRAWAL_PROCESSED'; commitment: Commitment; amount: bigint };

// Error types
export class BridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

export class CardanoError extends BridgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CARDANO_ERROR', details);
    this.name = 'CardanoError';
  }
}

export class MidnightError extends BridgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'MIDNIGHT_ERROR', details);
    this.name = 'MidnightError';
  }
}
