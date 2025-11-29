/**
 * StakeDrop Input Validation
 *
 * PHASE 4.1: Client-side validation for all user inputs
 *
 * This module provides:
 * - Deposit amount validation
 * - Secret file validation
 * - Commitment validation
 * - Address validation
 */

import { MIN_DEPOSIT_ADA, LOVELACE_PER_ADA } from './constants';

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

export const VALIDATION = {
  MIN_DEPOSIT_ADA: MIN_DEPOSIT_ADA,
  MAX_DEPOSIT_ADA: 1_000_000, // 1 million ADA max per deposit
  MIN_SECRET_LENGTH: 32,
  COMMITMENT_LENGTH: 32,
  MIN_PROOF_LENGTH: 64,
  TX_FEE_BUFFER_LOVELACE: 2_000_000, // 2 ADA buffer for tx fees
} as const;

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface DepositValidationInput {
  amount: string;
  balance: bigint;
  existingDeposits?: number;
}

export interface SecretFileValidationInput {
  content: string;
  expectedCommitment?: string;
}

export interface WithdrawalValidationInput {
  commitment: string;
  proof: string;
  poolStatus: number;
  winnerCommitment: string;
  isWinner: boolean;
  withdrawnCommitments: string[];
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate deposit amount against minimum, maximum, and balance
 */
export function validateDeposit(input: DepositValidationInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse amount
  const amountStr = input.amount.trim();
  if (!amountStr) {
    errors.push('Please enter a deposit amount');
    return { valid: false, errors };
  }

  const amountNum = parseFloat(amountStr);
  if (isNaN(amountNum)) {
    errors.push('Invalid amount: please enter a valid number');
    return { valid: false, errors };
  }

  // Check minimum
  if (amountNum < VALIDATION.MIN_DEPOSIT_ADA) {
    errors.push(`Minimum deposit is ${VALIDATION.MIN_DEPOSIT_ADA} ADA`);
  }

  // Check maximum
  if (amountNum > VALIDATION.MAX_DEPOSIT_ADA) {
    errors.push(`Maximum deposit is ${VALIDATION.MAX_DEPOSIT_ADA.toLocaleString()} ADA`);
  }

  // Check balance (including tx fee buffer)
  const amountLovelace = BigInt(Math.floor(amountNum * LOVELACE_PER_ADA));
  const requiredBalance = amountLovelace + BigInt(VALIDATION.TX_FEE_BUFFER_LOVELACE);

  if (requiredBalance > input.balance) {
    const availableAda = Number(input.balance) / LOVELACE_PER_ADA;
    const maxDeposit = Math.max(0, availableAda - VALIDATION.TX_FEE_BUFFER_LOVELACE / LOVELACE_PER_ADA);
    errors.push(
      `Insufficient balance. You have ${availableAda.toFixed(2)} ADA available. ` +
        `Maximum deposit: ${maxDeposit.toFixed(2)} ADA (including ~2 ADA for transaction fees)`
    );
  }

  // Add warnings for edge cases
  if (amountNum === VALIDATION.MIN_DEPOSIT_ADA) {
    warnings.push('This is the minimum deposit amount');
  }

  if (amountNum > 10000) {
    warnings.push('Large deposit detected. Please double-check the amount.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate secret file content and structure
 */
export function validateSecretFile(input: SecretFileValidationInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Try to parse JSON
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(input.content);
  } catch {
    errors.push('Invalid file format: not valid JSON');
    return { valid: false, errors };
  }

  // Check required fields
  if (!data.secret || typeof data.secret !== 'string') {
    errors.push('Missing or invalid secret field');
  } else if (!isValidHex(data.secret as string)) {
    errors.push('Secret is not valid hexadecimal');
  } else if ((data.secret as string).length !== 64) {
    errors.push(`Secret must be 32 bytes (64 hex chars), got ${(data.secret as string).length / 2} bytes`);
  }

  if (!data.amount) {
    errors.push('Missing amount field');
  }

  if (!data.commitment || typeof data.commitment !== 'string') {
    errors.push('Missing or invalid commitment field');
  } else if (!isValidHex(data.commitment as string)) {
    errors.push('Commitment is not valid hexadecimal');
  } else if ((data.commitment as string).length !== 64) {
    errors.push(
      `Commitment must be 32 bytes (64 hex chars), got ${(data.commitment as string).length / 2} bytes`
    );
  }

  // Check optional commitment match
  if (
    input.expectedCommitment &&
    data.commitment &&
    (data.commitment as string).toLowerCase() !== input.expectedCommitment.toLowerCase()
  ) {
    errors.push('Commitment does not match expected value');
  }

  // Check version
  if (data.version) {
    const version = data.version as string;
    if (!version.startsWith('2.')) {
      warnings.push(`Secret file version ${version} may not be fully compatible`);
    }
  } else {
    warnings.push('No version field found - this may be an older format');
  }

  // Check type
  if (data.type && data.type !== 'stakedrop-midnight-secret') {
    warnings.push(`Unexpected file type: ${data.type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate withdrawal inputs
 */
export function validateWithdrawal(input: WithdrawalValidationInput): ValidationResult {
  const errors: string[] = [];

  // Validate commitment format
  if (!input.commitment) {
    errors.push('Missing commitment');
  } else if (!isValidHex(input.commitment)) {
    errors.push('Commitment is not valid hexadecimal');
  } else if (input.commitment.length !== 64) {
    errors.push('Commitment must be 32 bytes (64 hex chars)');
  }

  // Validate proof format
  if (!input.proof) {
    errors.push('Missing proof');
  } else if (!isValidHex(input.proof)) {
    errors.push('Proof is not valid hexadecimal');
  } else if (input.proof.length < VALIDATION.MIN_PROOF_LENGTH * 2) {
    errors.push(`Proof must be at least ${VALIDATION.MIN_PROOF_LENGTH} bytes`);
  }

  // Check pool status (2 = Distributing)
  if (input.poolStatus !== 2) {
    const statusNames = ['Collecting', 'Staking', 'Distributing', 'Completed'];
    errors.push(
      `Pool is not in Distributing phase. Current status: ${statusNames[input.poolStatus] || 'Unknown'}`
    );
  }

  // Check replay protection
  if (input.withdrawnCommitments.includes(input.commitment)) {
    errors.push('This commitment has already been withdrawn');
  }

  // Check winner/loser proof type
  if (input.isWinner) {
    if (input.commitment !== input.winnerCommitment) {
      errors.push('Your commitment does not match the winner commitment');
    }
  } else {
    if (input.commitment === input.winnerCommitment) {
      errors.push('You are the winner - use winner withdrawal instead');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a Cardano address format
 */
export function validateCardanoAddress(address: string): ValidationResult {
  const errors: string[] = [];

  if (!address || address.trim() === '') {
    errors.push('Address is required');
    return { valid: false, errors };
  }

  const trimmed = address.trim();

  // Check prefix for network
  const validPrefixes = [
    'addr1', // mainnet
    'addr_test1', // testnet
    'stake1', // mainnet stake
    'stake_test1', // testnet stake
  ];

  const hasValidPrefix = validPrefixes.some((prefix) => trimmed.startsWith(prefix));
  if (!hasValidPrefix) {
    errors.push('Invalid address format: must start with addr1, addr_test1, stake1, or stake_test1');
  }

  // Check for valid bech32 characters
  const bech32Chars = /^[a-z0-9]+$/;
  const addressPart = trimmed.includes('1') ? trimmed.split('1').slice(1).join('1') : '';
  if (addressPart && !bech32Chars.test(addressPart)) {
    errors.push('Invalid address: contains invalid characters');
  }

  // Check reasonable length (addresses are typically 59-103 characters)
  if (trimmed.length < 50 || trimmed.length > 120) {
    errors.push('Invalid address: unexpected length');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate hex string format
 */
export function isValidHex(str: string): boolean {
  const cleanHex = str.startsWith('0x') ? str.slice(2) : str;
  return /^[0-9a-fA-F]*$/.test(cleanHex) && cleanHex.length % 2 === 0;
}

/**
 * Validate commitment format
 */
export function validateCommitment(commitment: string): ValidationResult {
  const errors: string[] = [];

  if (!commitment) {
    errors.push('Commitment is required');
    return { valid: false, errors };
  }

  if (!isValidHex(commitment)) {
    errors.push('Commitment must be a valid hexadecimal string');
  }

  const cleanHex = commitment.startsWith('0x') ? commitment.slice(2) : commitment;
  if (cleanHex.length !== VALIDATION.COMMITMENT_LENGTH * 2) {
    errors.push(`Commitment must be ${VALIDATION.COMMITMENT_LENGTH} bytes (${VALIDATION.COMMITMENT_LENGTH * 2} hex characters)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input string
 * Removes potentially dangerous characters and trims whitespace
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>'"&]/g, '') // Remove HTML/script injection chars
    .slice(0, 10000); // Limit length
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) {
    return '';
  }
  return result.errors.join('\n');
}
