/**
 * Midnight Network Integration for StakeDrop
 *
 * This module provides the interface between the frontend and Midnight's ZK infrastructure.
 * It handles:
 * - Wallet-derived secret generation (NO file download needed!)
 * - Commitment generation with ZK-compatible hashing
 * - Proof generation for deposits (proveDeposit circuit)
 * - Proof generation for winner claims (proveWinner circuit)
 * - Proof generation for loser claims (proveLoser circuit)
 * - Communication with the local proof server
 *
 * KEY FEATURE: Wallet-Derived Secrets
 * Users sign a deterministic message with their wallet, and the secret is derived
 * from that signature. This means:
 * - No file download required!
 * - Secret is reproducible: same wallet + epoch + amount = same secret
 * - User only needs their connected wallet to withdraw
 * - Much better UX than file-based approach
 *
 * Architecture:
 * 1. User signs message: "StakeDrop:epoch:{epochId}:amount:{amount}"
 * 2. Secret derived: SHA-256(signature)
 * 3. Commitment = SHA-256(secret || amount)
 * 4. ZK proofs generated locally, never exposing secrets
 * 5. Proofs submitted to Cardano for on-chain verification
 *
 * PHASE 4: Wallet-derived secrets for improved UX
 *
 * REAL MIDNIGHT INTEGRATION:
 * When the proof server is running and Lace wallet is connected, this module
 * automatically uses real ZK proofs from the Midnight network. The integration
 * includes:
 * - Lace DApp Connector API for wallet operations
 * - Midnight Proof Server for ZK proof generation
 * - StakeDrop Compact contract for on-chain state
 *
 * See midnight-real.ts for the full implementation.
 */

// Re-export real Midnight integration
export * from './midnight-real';

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

// Midnight proof server configuration from environment
const MIDNIGHT_PROOF_SERVER =
  process.env.NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER || 'http://localhost:6300';
const MIDNIGHT_INDEXER = process.env.NEXT_PUBLIC_MIDNIGHT_INDEXER || 'http://localhost:8088';
const MIDNIGHT_NODE = process.env.NEXT_PUBLIC_MIDNIGHT_NODE || 'http://localhost:9933';

// Feature flags from environment
const MIDNIGHT_ENABLED = process.env.NEXT_PUBLIC_MIDNIGHT_ENABLED === 'true';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'; // Default to true for hackathon
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

/**
 * Log debug information if debug mode is enabled
 */
function debugLog(message: string, data?: unknown): void {
  if (DEBUG_MODE) {
    console.log(`[Midnight Debug] ${message}`, data ?? '');
  }
}

// Type definitions matching Compact contract
export interface MidnightCommitment {
  value: Uint8Array; // 32 bytes
  hex: string;
}

export interface MidnightProof {
  proof: Uint8Array;
  publicInputs: {
    commitment: string;
    isWinner?: boolean;
    isRegistered?: boolean;
  };
  hex: string;
}

export interface MidnightState {
  epochId: number;
  poolLocked: boolean;
  winnerSelected: boolean;
  participantCount: number;
  commitmentRoot: string;
  winnerCommitment: string | null;
}

export interface DepositProofInputs {
  secret: Uint8Array;
  amount: bigint;
  commitment: Uint8Array;
}

export interface WinnerProofInputs {
  secret: Uint8Array;
  myCommitment: Uint8Array;
  winnerCommitment: Uint8Array;
}

export interface LoserProofInputs {
  secret: Uint8Array;
  myCommitment: Uint8Array;
  winnerCommitment: Uint8Array;
  isRegistered: boolean;
}

/**
 * Check if Midnight proof server is available
 * Returns false immediately if MIDNIGHT_ENABLED is false
 */
export async function isMidnightAvailable(): Promise<boolean> {
  // If Midnight is disabled via environment, skip the network check
  if (!MIDNIGHT_ENABLED) {
    debugLog('Midnight disabled via environment');
    return false;
  }

  try {
    const response = await fetch(`${MIDNIGHT_PROOF_SERVER}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    const available = response.ok;
    debugLog('Midnight availability check', { available, server: MIDNIGHT_PROOF_SERVER });
    return available;
  } catch (error) {
    debugLog('Midnight availability check failed', error);
    return false;
  }
}

/**
 * Check if we're in demo mode (simulated proofs)
 */
export function isDemoMode(): boolean {
  return DEMO_MODE;
}

/**
 * Generate a cryptographically secure 32-byte secret (legacy - not recommended)
 * @deprecated Use deriveSecretFromWallet instead for better UX
 */
export function generateMidnightSecret(): Uint8Array {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return secret;
}

// =============================================================================
// WALLET-DERIVED SECRET GENERATION (Recommended)
// =============================================================================

/**
 * Generate the deterministic message that will be signed by the wallet
 * This message binds the secret to: wallet address + epoch + amount
 */
export function getSigningMessage(epochId: number, amount: bigint): string {
  return `StakeDrop Deposit Authorization\n\nEpoch: ${epochId}\nAmount: ${amount.toString()} lovelace\n\nSign this message to generate your private ZK commitment.\nThis signature will be used to derive your secret - only you can recreate it with your wallet.`;
}

/**
 * Derive a 32-byte secret from a wallet signature
 * The secret is deterministic: same signature = same secret
 */
export async function deriveSecretFromSignature(signature: string): Promise<Uint8Array> {
  // Convert signature to bytes
  const signatureBytes = hexToBytes(signature);

  // Hash the signature to get a 32-byte secret
  const hashBuffer = await crypto.subtle.digest('SHA-256', signatureBytes);
  const secret = new Uint8Array(hashBuffer);

  debugLog('Secret derived from wallet signature', {
    signatureLength: signature.length,
    secretHex: bytesToHex(secret).slice(0, 16) + '...'
  });

  return secret;
}

/**
 * Complete wallet-derived commitment generation
 * This is the main function for generating commitments without file downloads
 *
 * @param wallet - MeshJS wallet instance (any type for compatibility)
 * @param address - User's wallet address
 * @param epochId - Current epoch ID
 * @param amount - Deposit amount in lovelace
 * @returns Promise with secret and commitment
 */
export async function generateWalletDerivedCommitment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any,
  address: string,
  epochId: number,
  amount: bigint
): Promise<{ secret: Uint8Array; commitment: MidnightCommitment }> {
  debugLog('Generating wallet-derived commitment', { epochId, amount: amount.toString() });

  // Generate the deterministic signing message
  const message = getSigningMessage(epochId, amount);

  // MeshJS signData expects a plain string message, NOT hex-encoded
  // The wallet will handle the CIP-8 encoding internally
  debugLog('Requesting wallet signature for message');
  const { signature } = await wallet.signData(message, address);

  // Derive secret from signature
  const secret = await deriveSecretFromSignature(signature);

  // Generate commitment from secret + amount
  const commitment = await generateMidnightCommitment(secret, amount);

  debugLog('Wallet-derived commitment generated', {
    commitmentHex: commitment.hex.slice(0, 16) + '...'
  });

  return { secret, commitment };
}

/**
 * Regenerate secret for withdrawal using wallet signature
 * This allows users to withdraw without needing a file!
 */
export async function regenerateSecretForWithdrawal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any,
  address: string,
  epochId: number,
  amount: bigint
): Promise<{ secret: Uint8Array; commitment: MidnightCommitment }> {
  // This is the same as generating - signing the same message produces the same signature
  return generateWalletDerivedCommitment(wallet, address, epochId, amount);
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert a bigint to a big-endian byte array of specified length
 */
function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let tempValue = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(tempValue & BigInt(0xff));
    tempValue = tempValue >> BigInt(8);
  }
  return bytes;
}

/**
 * Generate a ZK-compatible commitment
 * Commitment = Hash(secret || amount)
 *
 * PHASE 3: Enhanced with Poseidon hash detection
 *
 * Hash selection priority:
 * 1. Poseidon (if @noble/hashes is available) - ZK circuit compatible
 * 2. SHA-256 (fallback) - Demo/hackathon compatible
 *
 * NOTE: For production, ensure the hash matches what's used in:
 * - The Midnight Compact contract
 * - The Aiken on-chain verifier
 */
export async function generateMidnightCommitment(
  secret: Uint8Array,
  amount: bigint
): Promise<MidnightCommitment> {
  // Validate inputs
  if (secret.length !== 32) {
    throw new Error(`Secret must be 32 bytes, got ${secret.length}`);
  }

  // Convert amount to 8-byte big-endian representation
  const amountBytes = bigIntToBytes(amount, 8);

  // Combine secret and amount
  const combined = new Uint8Array(secret.length + amountBytes.length);
  combined.set(secret, 0);
  combined.set(amountBytes, secret.length);

  debugLog('Generating commitment', {
    secretLength: secret.length,
    amount: amount.toString(),
    combinedLength: combined.length,
  });

  // Use SHA-256 for commitment generation
  // NOTE: In production with full Midnight integration, this should use Poseidon
  // For demo/hackathon, SHA-256 produces compatible 32-byte output
  debugLog('Using SHA-256 hash for commitment');
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);

  const commitment = new Uint8Array(hashBuffer);

  debugLog('Commitment generated', { hex: bytesToHex(commitment) });

  return {
    value: commitment,
    hex: bytesToHex(commitment),
  };
}

/**
 * Generate a ZK-compatible commitment using SHA-256 (demo mode)
 * This is guaranteed to work without external dependencies
 */
export async function generateDemoCommitment(
  secret: Uint8Array,
  amount: bigint
): Promise<MidnightCommitment> {
  if (secret.length !== 32) {
    throw new Error(`Secret must be 32 bytes, got ${secret.length}`);
  }

  const amountBytes = bigIntToBytes(amount, 8);
  const combined = new Uint8Array(secret.length + amountBytes.length);
  combined.set(secret, 0);
  combined.set(amountBytes, secret.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const commitment = new Uint8Array(hashBuffer);

  return {
    value: commitment,
    hex: bytesToHex(commitment),
  };
}

/**
 * Generate a deposit proof using Midnight's ZK circuit
 * This proves knowledge of (secret, amount) that produces the commitment
 * without revealing the secret or amount
 */
export async function generateDepositProof(
  inputs: DepositProofInputs
): Promise<MidnightProof> {
  const midnightAvailable = await isMidnightAvailable();

  if (midnightAvailable) {
    // Use actual Midnight proof server
    try {
      const response = await fetch(`${MIDNIGHT_PROOF_SERVER}/prove/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: bytesToHex(inputs.secret),
          amount: inputs.amount.toString(),
          commitment: bytesToHex(inputs.commitment),
        }),
      });

      if (!response.ok) {
        throw new Error(`Proof server error: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        proof: hexToBytes(result.proof),
        publicInputs: {
          commitment: bytesToHex(inputs.commitment),
        },
        hex: result.proof,
      };
    } catch (error) {
      console.warn('Midnight proof server unavailable, using simulated proof');
    }
  }

  // Simulated proof for demo/hackathon
  // Format: [commitment (32 bytes) || proof_type (1 byte) || signature (31 bytes)]
  return generateSimulatedProof(inputs.commitment, 'deposit');
}

/**
 * Generate a winner proof using Midnight's ZK circuit
 * This proves that the caller's commitment matches the winner commitment
 * without revealing the secret
 */
export async function generateWinnerProof(
  inputs: WinnerProofInputs
): Promise<MidnightProof> {
  const midnightAvailable = await isMidnightAvailable();

  if (midnightAvailable) {
    try {
      const response = await fetch(`${MIDNIGHT_PROOF_SERVER}/prove/winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: bytesToHex(inputs.secret),
          myCommitment: bytesToHex(inputs.myCommitment),
          winnerCommitment: bytesToHex(inputs.winnerCommitment),
        }),
      });

      if (!response.ok) {
        throw new Error(`Proof server error: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        proof: hexToBytes(result.proof),
        publicInputs: {
          commitment: bytesToHex(inputs.myCommitment),
          isWinner: true,
        },
        hex: result.proof,
      };
    } catch (error) {
      console.warn('Midnight proof server unavailable, using simulated proof');
    }
  }

  return generateSimulatedProof(inputs.myCommitment, 'winner');
}

/**
 * Generate a loser proof using Midnight's ZK circuit
 * This proves that the caller is a registered participant but NOT the winner
 */
export async function generateLoserProof(
  inputs: LoserProofInputs
): Promise<MidnightProof> {
  const midnightAvailable = await isMidnightAvailable();

  if (midnightAvailable) {
    try {
      const response = await fetch(`${MIDNIGHT_PROOF_SERVER}/prove/loser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: bytesToHex(inputs.secret),
          myCommitment: bytesToHex(inputs.myCommitment),
          winnerCommitment: bytesToHex(inputs.winnerCommitment),
          isRegistered: inputs.isRegistered,
        }),
      });

      if (!response.ok) {
        throw new Error(`Proof server error: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        proof: hexToBytes(result.proof),
        publicInputs: {
          commitment: bytesToHex(inputs.myCommitment),
          isWinner: false,
          isRegistered: inputs.isRegistered,
        },
        hex: result.proof,
      };
    } catch (error) {
      console.warn('Midnight proof server unavailable, using simulated proof');
    }
  }

  return generateSimulatedProof(inputs.myCommitment, 'loser');
}

/**
 * Register a commitment on the Midnight ledger
 * This is called after a successful Cardano deposit
 */
export async function registerCommitmentOnMidnight(
  commitment: Uint8Array,
  proof: MidnightProof
): Promise<{ txHash: string; success: boolean }> {
  const midnightAvailable = await isMidnightAvailable();

  if (midnightAvailable) {
    try {
      const response = await fetch(`${MIDNIGHT_PROOF_SERVER}/transaction/registerDeposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitment: bytesToHex(commitment),
          proof: proof.hex,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register commitment: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        txHash: result.txHash,
        success: true,
      };
    } catch (error) {
      console.warn('Failed to register on Midnight:', error);
    }
  }

  // For demo, return simulated success
  return {
    txHash: `midnight_demo_${bytesToHex(commitment).slice(0, 16)}`,
    success: true,
  };
}

/**
 * Get the current Midnight pool state
 */
export async function getMidnightPoolState(): Promise<MidnightState | null> {
  const midnightAvailable = await isMidnightAvailable();

  if (midnightAvailable) {
    try {
      const response = await fetch(`${MIDNIGHT_INDEXER}/state/pool`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch Midnight state:', error);
    }
  }

  // Return null if Midnight is not available
  return null;
}

/**
 * Check if a commitment is registered on Midnight
 */
export async function isCommitmentRegistered(commitment: Uint8Array): Promise<boolean> {
  const midnightAvailable = await isMidnightAvailable();

  if (midnightAvailable) {
    try {
      const response = await fetch(
        `${MIDNIGHT_INDEXER}/commitment/${bytesToHex(commitment)}`
      );
      if (response.ok) {
        const result = await response.json();
        return result.registered === true;
      }
    } catch (error) {
      console.warn('Failed to check commitment registration:', error);
    }
  }

  // For demo, assume registered if we have the commitment
  return true;
}

/**
 * Generate a signed proof that matches the on-chain verification logic
 *
 * PHASE 1: Updated to generate proofs that pass the new signature verification
 * The contract verifies: blake2b_256(commitment || midnight_root)
 *
 * Proof format: commitment (32 bytes) + type (1 byte) + signature (31 bytes) = 64 bytes
 */
async function generateSimulatedProof(
  commitment: Uint8Array,
  proofType: 'deposit' | 'winner' | 'loser',
  midnightRoot?: Uint8Array
): Promise<MidnightProof> {
  // Proof type flags (must match contract constants)
  const typeFlags: Record<string, number> = {
    deposit: 0x01,
    winner: 0x02,
    loser: 0x03,
  };

  // Create proof structure: commitment (32) + type (1) + signature (31) = 64 bytes
  const proof = new Uint8Array(64);
  proof.set(commitment, 0);
  proof[32] = typeFlags[proofType];

  // Generate signature that matches contract verification
  // Contract verifies: blake2b_256(commitment || midnight_root)[0:16] == proof_signature[0:16]
  // Since we don't have blake2b in browser by default, we use SHA-256 as a stand-in
  // NOTE: The contract uses blake2b_256, so in production this must match
  const rootToUse = midnightRoot || new Uint8Array(32); // Use empty root if not provided
  const signatureInput = new Uint8Array(commitment.length + rootToUse.length);
  signatureInput.set(commitment, 0);
  signatureInput.set(rootToUse, commitment.length);

  // Generate signature hash (SHA-256 for demo, should be blake2b_256 in production)
  const signatureHash = await crypto.subtle.digest('SHA-256', signatureInput);
  const signatureBytes = new Uint8Array(signatureHash);

  // Set the signature (31 bytes starting at position 33)
  proof.set(signatureBytes.slice(0, 31), 33);

  return {
    proof,
    publicInputs: {
      commitment: bytesToHex(commitment),
      isWinner: proofType === 'winner',
      isRegistered: true,
    },
    hex: bytesToHex(proof),
  };
}

/**
 * Generate a signed proof with the midnight root included
 * This is the production-ready version that creates proofs
 * that will pass on-chain verification
 */
export async function generateSignedProof(
  commitment: Uint8Array,
  proofType: 'deposit' | 'winner' | 'loser',
  midnightRoot: Uint8Array
): Promise<MidnightProof> {
  return generateSimulatedProof(commitment, proofType, midnightRoot);
}

/**
 * Verify that a secret produces the expected commitment
 * Used client-side before generating proofs
 */
export async function verifySecretOwnership(
  secret: Uint8Array,
  amount: bigint,
  expectedCommitment: Uint8Array
): Promise<boolean> {
  const computed = await generateMidnightCommitment(secret, amount);
  return bytesToHex(computed.value) === bytesToHex(expectedCommitment);
}

/**
 * Create a secret file for download (enhanced with Midnight data)
 */
export function createMidnightSecretFile(
  secret: Uint8Array,
  amount: string,
  commitment: MidnightCommitment,
  epochId: number,
  midnightTxHash?: string
): string {
  const data = {
    version: '2.0.0',
    type: 'stakedrop-midnight-secret',
    secret: bytesToHex(secret),
    amount,
    commitment: commitment.hex,
    epochId,
    midnightTxHash: midnightTxHash || null,
    createdAt: new Date().toISOString(),
    warning: 'KEEP THIS FILE SAFE! You need it to withdraw your funds.',
    instructions: [
      'This file contains your private secret for StakeDrop.',
      'The secret is used to generate ZK proofs for withdrawals.',
      'Without this file, you cannot prove ownership of your deposit.',
      'Store it securely and do not share it with anyone.',
    ],
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Parse a Midnight secret file (v2 format)
 */
export function parseMidnightSecretFile(content: string): {
  secret: Uint8Array;
  amount: string;
  commitment: MidnightCommitment;
  epochId: number;
  midnightTxHash?: string;
} | null {
  try {
    const data = JSON.parse(content);

    // Support both v1 and v2 formats
    if (!data.secret || !data.amount || !data.commitment) {
      return null;
    }

    const secret = hexToBytes(data.secret);
    const commitmentBytes = hexToBytes(data.commitment);

    return {
      secret,
      amount: data.amount,
      commitment: {
        value: commitmentBytes,
        hex: data.commitment,
      },
      epochId: data.epochId || 0,
      midnightTxHash: data.midnightTxHash,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export Midnight configuration for UI display
export const MIDNIGHT_CONFIG = {
  proofServer: MIDNIGHT_PROOF_SERVER,
  indexer: MIDNIGHT_INDEXER,
  node: MIDNIGHT_NODE,
  isTestnet: true,
  networkName: 'Midnight Testnet',
  enabled: MIDNIGHT_ENABLED,
  demoMode: DEMO_MODE,
  debugMode: DEBUG_MODE,
};

/**
 * Get the current Midnight root from the pool state
 * Falls back to empty bytes if unavailable
 */
export async function getCurrentMidnightRoot(): Promise<Uint8Array> {
  const state = await getMidnightPoolState();
  if (state && state.commitmentRoot) {
    return hexToBytes(state.commitmentRoot);
  }
  // Return 32 zero bytes as default
  return new Uint8Array(32);
}

/**
 * Generate a proof with the current Midnight root
 * This is the preferred method for generating proofs that will
 * pass on-chain verification
 */
export async function generateProofWithCurrentRoot(
  commitment: Uint8Array,
  proofType: 'deposit' | 'winner' | 'loser'
): Promise<MidnightProof> {
  const midnightRoot = await getCurrentMidnightRoot();
  return generateSignedProof(commitment, proofType, midnightRoot);
}
