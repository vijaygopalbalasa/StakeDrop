/**
 * StakeDrop Cryptographic Utilities
 * Client-side commitment generation for privacy
 */

/**
 * Generate a random 32-byte secret
 */
export function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate commitment from secret and amount
 * commitment = hash(secret || amount)
 * This binds the amount to the secret without revealing either
 */
export async function generateCommitment(secret: string, amount: bigint): Promise<string> {
  // Combine secret and amount
  const data = `${secret}:${amount.toString()}`;

  // Hash using SHA-256 (in production, use Poseidon hash for ZK compatibility)
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const commitment = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return commitment;
}

/**
 * Verify a commitment matches the secret and amount
 */
export async function verifyCommitment(
  secret: string,
  amount: bigint,
  commitment: string
): Promise<boolean> {
  const computed = await generateCommitment(secret, amount);
  return computed === commitment;
}

/**
 * Create a deposit secret file for download
 */
export function createSecretFile(
  secret: string,
  amount: string,
  commitment: string,
  epochId: number
): string {
  const data = {
    secret,
    amount,
    commitment,
    createdAt: new Date().toISOString(),
    epochId,
    version: '1.0.0',
    warning: 'KEEP THIS FILE SAFE! You need it to withdraw your funds.',
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Parse a secret file
 */
export function parseSecretFile(content: string): {
  secret: string;
  amount: string;
  commitment: string;
  epochId: number;
} | null {
  try {
    const data = JSON.parse(content);

    if (!data.secret || !data.amount || !data.commitment) {
      return null;
    }

    return {
      secret: data.secret,
      amount: data.amount,
      commitment: data.commitment,
      epochId: data.epochId || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Hash data using SHA-256
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
