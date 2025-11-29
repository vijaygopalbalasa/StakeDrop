/**
 * StakeDrop Error Handling
 *
 * PHASE 4.2: Enhanced error handling for all operations
 *
 * This module provides:
 * - Custom error types with error codes
 * - User-friendly error messages
 * - Error parsing from blockchain responses
 * - Error logging utilities
 */

// =============================================================================
// ERROR CODES
// =============================================================================

export enum StakeDropErrorCode {
  // Wallet errors (1xx)
  WALLET_NOT_CONNECTED = 'E101',
  WALLET_CONNECTION_FAILED = 'E102',
  WALLET_INSUFFICIENT_FUNDS = 'E103',
  WALLET_SIGNING_FAILED = 'E104',
  WALLET_TX_SUBMIT_FAILED = 'E105',

  // Contract errors (2xx)
  CONTRACT_INVALID_DATUM = 'E201',
  CONTRACT_INVALID_REDEEMER = 'E202',
  CONTRACT_VALIDATION_FAILED = 'E203',
  CONTRACT_UTXO_NOT_FOUND = 'E204',
  CONTRACT_POOL_LOCKED = 'E205',
  CONTRACT_WRONG_STATUS = 'E206',
  CONTRACT_NOT_WINNER = 'E207',
  CONTRACT_ALREADY_WITHDRAWN = 'E208',
  CONTRACT_REPLAY_ATTACK = 'E209',

  // Midnight/ZK errors (3xx)
  MIDNIGHT_UNAVAILABLE = 'E301',
  MIDNIGHT_PROOF_FAILED = 'E302',
  MIDNIGHT_COMMITMENT_INVALID = 'E303',
  MIDNIGHT_SECRET_INVALID = 'E304',
  MIDNIGHT_VERIFICATION_FAILED = 'E305',

  // Input validation errors (4xx)
  VALIDATION_AMOUNT_TOO_LOW = 'E401',
  VALIDATION_AMOUNT_TOO_HIGH = 'E402',
  VALIDATION_INVALID_ADDRESS = 'E403',
  VALIDATION_INVALID_SECRET = 'E404',
  VALIDATION_INVALID_COMMITMENT = 'E405',
  VALIDATION_INVALID_FILE = 'E406',

  // Network errors (5xx)
  NETWORK_BLOCKFROST_ERROR = 'E501',
  NETWORK_TIMEOUT = 'E502',
  NETWORK_UNAVAILABLE = 'E503',

  // Unknown error
  UNKNOWN_ERROR = 'E999',
}

// =============================================================================
// ERROR MESSAGES
// =============================================================================

const ERROR_MESSAGES: Record<StakeDropErrorCode, string> = {
  // Wallet errors
  [StakeDropErrorCode.WALLET_NOT_CONNECTED]: 'Please connect your wallet to continue',
  [StakeDropErrorCode.WALLET_CONNECTION_FAILED]: 'Failed to connect wallet. Please try again.',
  [StakeDropErrorCode.WALLET_INSUFFICIENT_FUNDS]:
    'Insufficient funds in wallet. Please add more ADA.',
  [StakeDropErrorCode.WALLET_SIGNING_FAILED]:
    'Transaction signing was rejected or failed. Please try again.',
  [StakeDropErrorCode.WALLET_TX_SUBMIT_FAILED]:
    'Failed to submit transaction to the network. Please try again.',

  // Contract errors
  [StakeDropErrorCode.CONTRACT_INVALID_DATUM]: 'Invalid contract data. Please refresh and try again.',
  [StakeDropErrorCode.CONTRACT_INVALID_REDEEMER]: 'Invalid transaction action. Please try again.',
  [StakeDropErrorCode.CONTRACT_VALIDATION_FAILED]:
    'Transaction validation failed. The contract rejected this operation.',
  [StakeDropErrorCode.CONTRACT_UTXO_NOT_FOUND]:
    'Pool contract not found. It may have been spent or not deployed.',
  [StakeDropErrorCode.CONTRACT_POOL_LOCKED]:
    'The pool is currently locked. Deposits are not being accepted.',
  [StakeDropErrorCode.CONTRACT_WRONG_STATUS]:
    'This operation is not allowed in the current pool phase.',
  [StakeDropErrorCode.CONTRACT_NOT_WINNER]:
    'Your commitment does not match the winner. Use loser withdrawal instead.',
  [StakeDropErrorCode.CONTRACT_ALREADY_WITHDRAWN]:
    'Funds have already been withdrawn for this commitment.',
  [StakeDropErrorCode.CONTRACT_REPLAY_ATTACK]:
    'This withdrawal has already been processed. Duplicate withdrawal rejected.',

  // Midnight/ZK errors
  [StakeDropErrorCode.MIDNIGHT_UNAVAILABLE]:
    'Midnight network is unavailable. Using demo mode for proofs.',
  [StakeDropErrorCode.MIDNIGHT_PROOF_FAILED]:
    'Failed to generate ZK proof. Please try again.',
  [StakeDropErrorCode.MIDNIGHT_COMMITMENT_INVALID]:
    'Invalid commitment format. Please check your secret file.',
  [StakeDropErrorCode.MIDNIGHT_SECRET_INVALID]:
    'Invalid secret format. The secret must be 32 bytes.',
  [StakeDropErrorCode.MIDNIGHT_VERIFICATION_FAILED]:
    'Proof verification failed. The secret may not match the commitment.',

  // Input validation errors
  [StakeDropErrorCode.VALIDATION_AMOUNT_TOO_LOW]: 'Deposit amount is below the minimum (10 ADA).',
  [StakeDropErrorCode.VALIDATION_AMOUNT_TOO_HIGH]:
    'Deposit amount exceeds maximum allowed.',
  [StakeDropErrorCode.VALIDATION_INVALID_ADDRESS]: 'Invalid Cardano address format.',
  [StakeDropErrorCode.VALIDATION_INVALID_SECRET]: 'Invalid secret format in file.',
  [StakeDropErrorCode.VALIDATION_INVALID_COMMITMENT]: 'Invalid commitment format.',
  [StakeDropErrorCode.VALIDATION_INVALID_FILE]:
    'Invalid secret file. Please use the file downloaded during deposit.',

  // Network errors
  [StakeDropErrorCode.NETWORK_BLOCKFROST_ERROR]:
    'Blockfrost API error. Please try again in a moment.',
  [StakeDropErrorCode.NETWORK_TIMEOUT]:
    'Network request timed out. Please check your connection and try again.',
  [StakeDropErrorCode.NETWORK_UNAVAILABLE]:
    'Network is unavailable. Please check your internet connection.',

  // Unknown error
  [StakeDropErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================

export class StakeDropError extends Error {
  public readonly code: StakeDropErrorCode;
  public readonly userMessage: string;
  public readonly details?: unknown;
  public readonly timestamp: Date;

  constructor(
    code: StakeDropErrorCode,
    details?: unknown,
    customMessage?: string
  ) {
    const userMessage = customMessage || ERROR_MESSAGES[code];
    super(userMessage);
    this.name = 'StakeDropError';
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StakeDropError);
    }
  }

  /**
   * Get a formatted error message for display
   */
  toUserMessage(): string {
    return this.userMessage;
  }

  /**
   * Get full error info for logging
   */
  toLogFormat(): object {
    return {
      code: this.code,
      message: this.userMessage,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

// =============================================================================
// ERROR PARSING UTILITIES
// =============================================================================

/**
 * Parse Cardano/Blockfrost error messages and convert to StakeDropError
 */
export function parseCardanoError(error: unknown): StakeDropError {
  const errorStr = String(error);
  const errorLower = errorStr.toLowerCase();

  // Check for common error patterns
  if (errorLower.includes('insufficient') || errorLower.includes('utxo balance')) {
    return new StakeDropError(StakeDropErrorCode.WALLET_INSUFFICIENT_FUNDS, error);
  }

  if (errorLower.includes('user rejected') || errorLower.includes('cancelled')) {
    return new StakeDropError(StakeDropErrorCode.WALLET_SIGNING_FAILED, error);
  }

  if (errorLower.includes('utxo not found') || errorLower.includes('no utxo')) {
    return new StakeDropError(StakeDropErrorCode.CONTRACT_UTXO_NOT_FOUND, error);
  }

  if (errorLower.includes('script') || errorLower.includes('validator')) {
    return new StakeDropError(StakeDropErrorCode.CONTRACT_VALIDATION_FAILED, error);
  }

  if (errorLower.includes('timeout')) {
    return new StakeDropError(StakeDropErrorCode.NETWORK_TIMEOUT, error);
  }

  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return new StakeDropError(StakeDropErrorCode.NETWORK_UNAVAILABLE, error);
  }

  if (errorLower.includes('blockfrost') || errorLower.includes('api')) {
    return new StakeDropError(StakeDropErrorCode.NETWORK_BLOCKFROST_ERROR, error);
  }

  // Default to unknown error
  return new StakeDropError(StakeDropErrorCode.UNKNOWN_ERROR, error);
}

/**
 * Parse wallet-specific errors
 */
export function parseWalletError(error: unknown): StakeDropError {
  const errorStr = String(error);
  const errorLower = errorStr.toLowerCase();

  if (errorLower.includes('not connected') || errorLower.includes('no wallet')) {
    return new StakeDropError(StakeDropErrorCode.WALLET_NOT_CONNECTED, error);
  }

  if (errorLower.includes('rejected') || errorLower.includes('declined')) {
    return new StakeDropError(StakeDropErrorCode.WALLET_SIGNING_FAILED, error);
  }

  if (errorLower.includes('balance') || errorLower.includes('insufficient')) {
    return new StakeDropError(StakeDropErrorCode.WALLET_INSUFFICIENT_FUNDS, error);
  }

  if (errorLower.includes('submit') || errorLower.includes('broadcast')) {
    return new StakeDropError(StakeDropErrorCode.WALLET_TX_SUBMIT_FAILED, error);
  }

  return new StakeDropError(StakeDropErrorCode.WALLET_CONNECTION_FAILED, error);
}

/**
 * Parse Midnight/ZK errors
 */
export function parseMidnightError(error: unknown): StakeDropError {
  const errorStr = String(error);
  const errorLower = errorStr.toLowerCase();

  if (errorLower.includes('unavailable') || errorLower.includes('connection')) {
    return new StakeDropError(StakeDropErrorCode.MIDNIGHT_UNAVAILABLE, error);
  }

  if (errorLower.includes('proof') || errorLower.includes('prove')) {
    return new StakeDropError(StakeDropErrorCode.MIDNIGHT_PROOF_FAILED, error);
  }

  if (errorLower.includes('commitment')) {
    return new StakeDropError(StakeDropErrorCode.MIDNIGHT_COMMITMENT_INVALID, error);
  }

  if (errorLower.includes('secret')) {
    return new StakeDropError(StakeDropErrorCode.MIDNIGHT_SECRET_INVALID, error);
  }

  if (errorLower.includes('verify') || errorLower.includes('verification')) {
    return new StakeDropError(StakeDropErrorCode.MIDNIGHT_VERIFICATION_FAILED, error);
  }

  return new StakeDropError(StakeDropErrorCode.MIDNIGHT_PROOF_FAILED, error);
}

// =============================================================================
// ERROR HANDLING HELPERS
// =============================================================================

/**
 * Wrap an async function with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorParser: (error: unknown) => StakeDropError = parseCardanoError
): Promise<{ success: true; data: T } | { success: false; error: StakeDropError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const parsedError =
      error instanceof StakeDropError ? error : errorParser(error);
    console.error('[StakeDrop Error]', parsedError.toLogFormat());
    return { success: false, error: parsedError };
  }
}

/**
 * Get user-friendly error message from any error
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof StakeDropError) {
    return error.toUserMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return ERROR_MESSAGES[StakeDropErrorCode.UNKNOWN_ERROR];
}

/**
 * Log error with context for debugging
 */
export function logError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  const errorInfo =
    error instanceof StakeDropError
      ? error.toLogFormat()
      : { message: String(error), stack: error instanceof Error ? error.stack : undefined };

  console.error(`[StakeDrop Error - ${context}]`, {
    ...errorInfo,
    ...additionalData,
    timestamp: new Date().toISOString(),
  });
}
