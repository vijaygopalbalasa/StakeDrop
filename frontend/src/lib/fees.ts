/**
 * StakeDrop Transaction Fee Estimation
 *
 * PHASE 4.3: Transaction fee estimation for better UX
 *
 * This module provides:
 * - Fee estimation for different transaction types
 * - Network fee parameter fetching
 * - Buffer calculations for transaction safety
 */

import { LOVELACE_PER_ADA } from './constants';

// =============================================================================
// FEE CONSTANTS
// =============================================================================

/**
 * Base transaction fee constants for Cardano
 * These are approximate values - actual fees depend on tx size
 */
export const FEE_CONSTANTS = {
  // Minimum fee coefficient (lovelace per byte)
  MIN_FEE_A: 44,
  // Minimum fee constant (lovelace)
  MIN_FEE_B: 155381,
  // Price per execution step (lovelace)
  PRICE_STEP: 0.0000721,
  // Price per memory unit (lovelace)
  PRICE_MEM: 0.0577,

  // Approximate transaction sizes (bytes)
  SIMPLE_TX_SIZE: 300,
  SCRIPT_TX_SIZE: 1500,
  DEPOSIT_TX_SIZE: 2000,
  WITHDRAWAL_TX_SIZE: 2500,

  // Safety buffer (percentage)
  SAFETY_BUFFER_PERCENT: 20,

  // Minimum UTxO value (lovelace)
  MIN_UTXO_VALUE: 1_000_000,
} as const;

// =============================================================================
// FEE ESTIMATION TYPES
// =============================================================================

export interface FeeEstimate {
  baseFee: bigint;
  scriptFee: bigint;
  totalFee: bigint;
  totalWithBuffer: bigint;
  formattedAda: string;
}

export interface TransactionCosts {
  txFee: bigint;
  minUtxo: bigint;
  deposit: bigint;
  total: bigint;
  formattedTotal: string;
}

export type TransactionType = 'deposit' | 'withdraw_winner' | 'withdraw_loser' | 'admin';

// =============================================================================
// FEE ESTIMATION FUNCTIONS
// =============================================================================

/**
 * Calculate base transaction fee (without script execution)
 */
export function calculateBaseFee(txSizeBytes: number): bigint {
  const fee = FEE_CONSTANTS.MIN_FEE_A * txSizeBytes + FEE_CONSTANTS.MIN_FEE_B;
  return BigInt(Math.ceil(fee));
}

/**
 * Estimate script execution fee
 * This is approximate - actual fee depends on script execution
 */
export function estimateScriptFee(steps: number = 200_000_000, mem: number = 500_000): bigint {
  const stepCost = steps * FEE_CONSTANTS.PRICE_STEP;
  const memCost = mem * FEE_CONSTANTS.PRICE_MEM;
  return BigInt(Math.ceil(stepCost + memCost));
}

/**
 * Add safety buffer to fee estimate
 */
export function addSafetyBuffer(fee: bigint): bigint {
  const buffer = (fee * BigInt(FEE_CONSTANTS.SAFETY_BUFFER_PERCENT)) / BigInt(100);
  return fee + buffer;
}

/**
 * Estimate total transaction fee for a given transaction type
 */
export function estimateTransactionFee(txType: TransactionType): FeeEstimate {
  let txSize: number;
  let steps: number;
  let mem: number;

  switch (txType) {
    case 'deposit':
      txSize = FEE_CONSTANTS.DEPOSIT_TX_SIZE;
      steps = 300_000_000;
      mem = 800_000;
      break;
    case 'withdraw_winner':
      txSize = FEE_CONSTANTS.WITHDRAWAL_TX_SIZE;
      steps = 400_000_000;
      mem = 1_000_000;
      break;
    case 'withdraw_loser':
      txSize = FEE_CONSTANTS.WITHDRAWAL_TX_SIZE;
      steps = 350_000_000;
      mem = 900_000;
      break;
    case 'admin':
      txSize = FEE_CONSTANTS.SCRIPT_TX_SIZE;
      steps = 200_000_000;
      mem = 500_000;
      break;
    default:
      txSize = FEE_CONSTANTS.SIMPLE_TX_SIZE;
      steps = 0;
      mem = 0;
  }

  const baseFee = calculateBaseFee(txSize);
  const scriptFee = estimateScriptFee(steps, mem);
  const totalFee = baseFee + scriptFee;
  const totalWithBuffer = addSafetyBuffer(totalFee);

  return {
    baseFee,
    scriptFee,
    totalFee,
    totalWithBuffer,
    formattedAda: formatLovelaceAsAda(totalWithBuffer),
  };
}

/**
 * Calculate total transaction costs including UTxO requirements
 */
export function calculateTransactionCosts(
  txType: TransactionType,
  depositAmount?: bigint
): TransactionCosts {
  const feeEstimate = estimateTransactionFee(txType);

  // Minimum UTxO that must remain in wallet
  const minUtxo = BigInt(FEE_CONSTANTS.MIN_UTXO_VALUE);

  // The actual deposit amount (if this is a deposit transaction)
  const deposit = depositAmount || BigInt(0);

  // Total = fee + deposit + buffer for min UTxO
  const total = feeEstimate.totalWithBuffer + deposit + minUtxo;

  return {
    txFee: feeEstimate.totalWithBuffer,
    minUtxo,
    deposit,
    total,
    formattedTotal: formatLovelaceAsAda(total),
  };
}

/**
 * Check if wallet has sufficient balance for transaction
 */
export function hasSufficientBalance(
  walletBalance: bigint,
  txType: TransactionType,
  depositAmount?: bigint
): { sufficient: boolean; required: bigint; shortfall: bigint } {
  const costs = calculateTransactionCosts(txType, depositAmount);

  const sufficient = walletBalance >= costs.total;
  const shortfall = sufficient ? BigInt(0) : costs.total - walletBalance;

  return {
    sufficient,
    required: costs.total,
    shortfall,
  };
}

/**
 * Get maximum deposit amount based on wallet balance
 */
export function getMaxDepositAmount(walletBalance: bigint): bigint {
  const feeEstimate = estimateTransactionFee('deposit');
  const reserveAmount =
    feeEstimate.totalWithBuffer + BigInt(FEE_CONSTANTS.MIN_UTXO_VALUE * 2);

  if (walletBalance <= reserveAmount) {
    return BigInt(0);
  }

  return walletBalance - reserveAmount;
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format lovelace amount as ADA string
 */
export function formatLovelaceAsAda(lovelace: bigint): string {
  const ada = Number(lovelace) / LOVELACE_PER_ADA;
  return `${ada.toFixed(2)} ADA`;
}

/**
 * Format fee breakdown for display
 */
export function formatFeeBreakdown(estimate: FeeEstimate): string {
  const baseFeeAda = (Number(estimate.baseFee) / LOVELACE_PER_ADA).toFixed(4);
  const scriptFeeAda = (Number(estimate.scriptFee) / LOVELACE_PER_ADA).toFixed(4);
  const totalAda = (Number(estimate.totalWithBuffer) / LOVELACE_PER_ADA).toFixed(4);

  return `Base: ${baseFeeAda} ADA + Script: ${scriptFeeAda} ADA = Total: ~${totalAda} ADA`;
}

/**
 * Get human-readable transaction type name
 */
export function getTransactionTypeName(txType: TransactionType): string {
  switch (txType) {
    case 'deposit':
      return 'Deposit';
    case 'withdraw_winner':
      return 'Winner Withdrawal';
    case 'withdraw_loser':
      return 'Loser Withdrawal';
    case 'admin':
      return 'Admin Operation';
    default:
      return 'Transaction';
  }
}

// =============================================================================
// FEE DISPLAY COMPONENT HELPERS
// =============================================================================

export interface FeeDisplayData {
  typeName: string;
  estimatedFee: string;
  breakdown: string;
  minRequired: string;
  maxDeposit: string;
}

/**
 * Get all fee display data for a transaction
 */
export function getFeeDisplayData(
  txType: TransactionType,
  walletBalance: bigint,
  depositAmount?: bigint
): FeeDisplayData {
  const estimate = estimateTransactionFee(txType);
  const costs = calculateTransactionCosts(txType, depositAmount);
  const maxDeposit = getMaxDepositAmount(walletBalance);

  return {
    typeName: getTransactionTypeName(txType),
    estimatedFee: estimate.formattedAda,
    breakdown: formatFeeBreakdown(estimate),
    minRequired: formatLovelaceAsAda(costs.total),
    maxDeposit: formatLovelaceAsAda(maxDeposit),
  };
}
