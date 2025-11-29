/**
 * StakeDrop Smart Contract Integration
 * Uses MeshJS to interact with the Aiken validator on Cardano
 *
 * NOTE: This module avoids direct MeshJS imports to support SSR/static generation.
 * MeshJS functions are imported dynamically only when needed on the client.
 */

import { LOVELACE_PER_ADA } from './constants';

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

// Network configuration from environment
export const CARDANO_NETWORK =
  (process.env.NEXT_PUBLIC_CARDANO_NETWORK as 'preview' | 'preprod' | 'mainnet') || 'preview';

// Validator hash from environment (falls back to compiled hash)
export const POOL_VALIDATOR_HASH =
  process.env.NEXT_PUBLIC_POOL_VALIDATOR_HASH ||
  'b70f951d843a747f8a41e81aaa107a5f427b8e4a8b2124048e9030c7';

// Script addresses per network (from environment or defaults)
const POOL_SCRIPT_ADDRESSES: Record<string, string> = {
  preview:
    process.env.NEXT_PUBLIC_POOL_SCRIPT_ADDRESS_PREVIEW ||
    'addr_test1wzmslj5wvgs6jr039puqx42qfa06snu3j29cvyjpywjqc8sr9kww5',
  preprod:
    process.env.NEXT_PUBLIC_POOL_SCRIPT_ADDRESS_PREPROD ||
    'addr_test1wzmslj5wvgs6jr039puqx42qfa06snu3j29cvyjpywjqc8sr9kww5',
  mainnet: process.env.NEXT_PUBLIC_POOL_SCRIPT_ADDRESS_MAINNET || '',
};

// Admin address from environment
export const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '';

// Feature flags
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
export const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

// Pool configuration
export const MIN_DEPOSIT_ADA = parseInt(process.env.NEXT_PUBLIC_MIN_DEPOSIT_ADA || '10', 10);
export const EPOCH_DURATION_DAYS = parseInt(process.env.NEXT_PUBLIC_EPOCH_DURATION_DAYS || '7', 10);

// Type definition for Plutus scripts
type PlutusScript = {
  code: string;
  version: 'V1' | 'V2' | 'V3';
};

// =============================================================================
// CONTRACT CBOR (Compiled Aiken validator)
// =============================================================================

// Contract blueprint from Aiken compilation
// This is the compiled validator from plutus.json
// PHASE 1: Updated with security fixes (ZK proof verification, division guard, replay protection)
const POOL_VALIDATOR_CBOR =
  '590f5601010029800aba2aba1aba0aab9faab9eaab9dab9a488888896600264653001300800198041804800cdc3a400530080024888966002600460106ea800e3300130093754007370e90024dc3a400d370e90004c020dd5002244444664464b300130050048991919912cc004c06400e00b1640586eb4c058004dd7180b001180b00098089baa00c8acc004c0280122b3001301137540190018b20248acc004c01c01226464b30013017002801c590141bad301500130113754019159800980300244c8c8cc896600260320070058b202c375c602c0026eb8c058008c058004c044dd5006456600266e1d20080048991919912cc004c06400e00b1640586eb8c058004dd7180b001180b00098089baa00c8acc004cdc3a401400913232332259800980c801c0162c80b0dd7180b0009bae301600230160013011375401915980099b87480300122b3001301137540190018b20248b201e403c807900f201e403c80785660026008601e6ea800633001301330103754003374a900048c050c05400646028602a602a602a602a0032301430153015301530153015301530153015301530150019180a180a980a980a980a980a980a800c88c8cc00400400c896600200314a115980099b8f375c602e00200714a31330020023018001404880aa46028602a602a602a602a602a602a602a602a003300f3754017230143015301530153015301530153015301530153015301530150019180a180a980a980a980a980a980a980a980a980a980a980a800c8c050c054c054c054c054c054c054c054c054c05400646028602a602a602a602a602a003230143015301530150019180a180a980a800cdd7a60103d87980009b87481026e012002488888888888888888a600244646600200200644b30010018a60103d87a80008992cc004c0100062602c6605200297ae08998018019815801204a3029001409d23259800980e98119baa0018a40011375a604e60486ea8005022192cc004c074c08cdd5000c530103d87a8000899198008009bab30283025375400444b30010018a6103d87a8000899192cc004cdc8a45000018acc004cdc7a441000018980b99815181400125eb82298103d87a80004099133004004302c00340986eb8c098004c0a4005027204432330010013756602460486ea8008896600200314c103d87a8000899192cc004cdc8a45000018acc004cdc7a441000018980b19814981380125eb82298103d87a80004095133004004302b00340946eb8c094004c0a0005026488cc038dd6180698121baa0020019192cc004c068c08cdd5000c4c966002603260486ea800626464646464646464646464646530013758606a003375c606a01b375a606a019375a606a017375a606a015375a606a013375c606a011375c606a00d375a606a00b375c606a009375a606a00732598009819800c56600266e25200430320018b44c0b0c0c80050314590341baa3035002488888888888966002608401b132332259800981a801456600260826ea800e003164109159800981d001456600260826ea800e003164109159800981b801456600260826ea800e003164109159800981b001456600260826ea800e0031641091640fc81f903f207e303e37540022646600200201c44b3001001880ec4c8cc00c00cc118008dd71822000a08430410138b207e181a800981a000981980098190009818800981800098178009817000981680098160009815800981500098129baa0018b2046302730243754003164088600a60466ea8005222232332259800980e808c4c8cc8966002601a602e60586ea80722b30013371290406d6204800c56600260186e3400a26464b30013370e601600466e0001c00e2b30013371e6eb8c0c4c0b8dd50009bae3031302e375403d15980099b87375a6038605c6ea8004dd6980e18171baa01e8acc004cdc39bad3010302e37540026eb4c040c0b8dd500f456600266e1cdd6980898171baa001337006eb4c044c0b8dd500f001c56600266e1cdd6980d98171baa001300d375a6036605c6ea807a2b3001300f3019302e375400315980099b8f375c6024605c6ea8004dd7180918171baa01e8acc004c8cdc79bae3001302f37540046eb8c004c0bcdd500f918191819981998199819981998199819800c56600266e1cdd6980b98171baa001375a602e605c6ea807a2b30013371e6eb8c04cc0b8dd50009bae3013302e375403d15980099b87375a6034605c6ea8004dd6980d18171baa01e8acc00566002604e605a6ea8c050c0b8dd5000c4c09cc0b4dd5180a18171baa01e8cc004c09cc0b4dd5180a18171baa01ea50a5140b08162266ebcc054c0b8dd5000980a98171baa01e8a5040b114a08162294102c452820588a5040b114a08162294102c452820588a5040b114a08162294102c452820588a5040b060100026600804803d1640a91640a91640a86eb8c0b4004dd69816981700098149baa0248992cc004c08c04a2b300133006022375c605a60546ea806a2b3001300b3015302a375403515980099b8948010dd6980b98151baa01a899192cc004cdc48029804801456600266e3cdd7181798161baa001375c605e60586ea80722b30013370e6eb4c068c0b0dd50009bad301a302c375403915980099b87375a601e60586ea8004dd6980798161baa01c8acc004cdc39bad3019302c37540026eb4c064c0b0dd500e45660026006602e60586ea80062b30013020375a603060586ea80062b300159800981298159baa3012302c375400314a119800a50a50a5140a88152266ebcc04cc0b0dd5000a6010180008a5040a914a08152294102a452820548a5040a914a08152294102a4528205430060013300202201c8b20508b20508b20508acc004c08004a264b300133007023375c605c60566ea806e2b300130023016302b375403715980099b89375a602860566ea806c00626464b30013371266e00dd6980818169baa01d003300a0028acc004cdc79bae3030302d37540026eb8c0c0c0b4dd500ec56600266e1cdd6980818169baa001375a6020605a6ea80762b30013370e6eb4c068c0b4dd50009bad301a302d375403b15980099b87375a602c605a6ea800400e260086030605a6ea8006294102b452820568a5040ad14a0815a294102b18038009980181180ec590294590294590291bad302d302a375404b132332259800981100ac4c8c9660026601604e6eb8c0c8c0bcdd500fc566002600c6034605e6ea807e2b3001300f371a003159800cc004dd71819181980140066eb8c04cc0bcdd500fa008899192cc004cdc48051807001456600266e3cdd7181a18189baa001375c606860626ea80862b30013370e6eb4c050c0c4dd50009bad30143031375404315980099b87375a603c60626ea8004dd6980f18189baa0218acc004cdc39bad301a303137540026eb4c068c0c4dd5010c566002600a603860626ea80062b30013371e6eb8c058c0c4dd5000801c566002604a6eb4c074c0c4dd5000c566002605460606ea8c05cc0c4dd5000c52846600294294294502f205e8a5040bd14a0817a294102f4528205e8a5040bd14a0817a294102f4528205e300b001330070270218b205a8b205a8b205a8b205a375c6062002605a6ea80a2264b30013370e900400b44c8cc8966002600a603860626ea80862b300159800981518181baa30173031375404314a119800a50a50a5140bc817a2b30013371090001bad301e30313754043159800cc004cc06cdd6180c18189baa021002a50a5140bd15980099b8f002375c602c60626ea80862b300159800cc0040066eb8c058c0c4dd5010cdd7180a98189baa0214019130273371c00290204528205e899192cc004cdc499b8100c3370066e0cdd6980b18199baa023375a604060666ea808cdd6980e18199baa02330100028acc004cdc79bae3036303337540026eb8c0d8c0ccdd5011c566002600e603c60666ea80062b300159800981618191baa30193033375400314a319800a51a50a5140c4818a2b30013370e6eb4c07cc0ccdd500098091bad301f3033375404715980099b87375a602c60666ea8004dd6980b18199baa0238acc004cdc39bad301c303337540026eb4c070c0ccdd5011c4cdd7980d18199baa001374e6600c6eb0c068c0ccdd5011802452820628a5040c514a0818a2941031452820628a5040c514a08188c034004cc0240a408e2c817a2c817a2c817a2c817a2c817a2c8178dd718190009bae30323033001302e375405315980099b874802805a2646644b30013005301c3031375404315980099b8848000dd6980f18189baa0218acc0066002660366eb0c060c0c4dd5010801528528a05e8acc004c044dc6801456600330013371e0046eb8c058c0c4dd5010d28528a05e8acc0056600330010019bae301630313754043375c602a60626ea808500644c098cdc7000a408114a0817a26464b30013371266e04030cdc19bad3016303337540466eb4c080c0ccdd50119808001456600266e3cdd7181b18199baa001375c606c60666ea808e2b30013007301e3033375400315980099b87375a603e60666ea8004c048dd6980f98199baa0238acc004cdc39bad3016303337540026eb4c058c0ccdd5011c56600266e1cdd6980e18199baa001375a603860666ea808e2b300159800981618191baa3019303337540031302c30323754603260666ea808e33001302c30323754603260666ea808e9429450312062899baf301a303337540026e9ccc018dd6180d18199baa0230048a5040c514a0818a2941031452820628a5040c514a0818a2941031180680099804814811c5902f45902f45902f45902f45902f45902f1bae3032001375c60646066002605c6ea80a62b30013300a026375c6062605c6ea807a2b3001598009801180c98171baa01e8a51899baf3019302e375403c980103d87c800040b113370e6eb4c068c0b8dd500f1bad301b302e375403d14a081622c816102c2058223303137520020048158888c9660033001001a50a5140b514a113259800801456600266e3e600200b480029020200c0048acc0056600266e252002001899b890014801a294102e44cdc7cc004dca19b8a004003a4001480810064c006600200b4810a901f200ca4001480810064528205c8a5040b914a08170cdc70022408081696600266e25208001371a0071300e371a00514a08160dd7a6103d87b800022298008014c030cdc0800801400d71840a08140dd7a6103d87a8000409c60086600203e032446464b3001301f302a37540031302e302b37540031640a4660106eb0c030c0a8dd5001919baf302e302b3754002004605860526ea8cc00c00800488c966002603a60506ea80062602e60526ea8c0b0c0a4dd5000c59027198031bac302b30283754004466ebcc0b0c0a4dd50008011164038602200a6022602400a8b200e180400098019baa0088a4d1365640041';

// Pool status enum (matches Aiken type)
export enum PoolStatus {
  Collecting = 0,
  Staking = 1,
  Distributing = 2,
  Completed = 3,
}

// Pool datum structure (matches Aiken PoolDatum)
// PHASE 1.3: Added withdrawnCommitments for replay protection
export interface PoolDatum {
  admin: string; // Hex-encoded pubkey hash
  epochId: number;
  epochEnd: number; // POSIX milliseconds
  totalDeposited: bigint;
  participantCount: number;
  midnightRoot: string; // Hex-encoded
  status: PoolStatus;
  stakePoolId: string; // Hex-encoded
  yieldAmount: bigint;
  winnerCommitment: string; // Hex-encoded
  withdrawalCount: number;
  winnerWithdrawn: boolean;
  withdrawnCommitments: string[]; // PHASE 1.3: List of commitments that have withdrawn
}

// Redeemer types (matches Aiken PoolRedeemer)
// PHASE 1.3: WithdrawWinner and WithdrawLoser now include commitment for replay protection
export type PoolRedeemer =
  | { type: 'Deposit'; commitment: string; amount: bigint }
  | { type: 'InitiateStaking' }
  | { type: 'UpdateYield'; newYield: bigint }
  | { type: 'FinalizeEpoch'; winnerCommitment: string; winnerProof: string }
  | { type: 'WithdrawWinner'; commitment: string; midnightProof: string }
  | { type: 'WithdrawLoser'; commitment: string; midnightProof: string }
  | { type: 'ClosePool' };

/**
 * Get the validator script object for MeshJS
 */
export function getPoolValidator(): PlutusScript {
  return {
    code: POOL_VALIDATOR_CBOR,
    version: 'V3',
  };
}

/**
 * Get the script hash (policy ID)
 */
export function getPoolValidatorHash(): string {
  return POOL_VALIDATOR_HASH;
}

/**
 * Get the script address for the pool validator
 * Uses configured network from environment if not specified
 * @param network - 'mainnet', 'preview', or 'preprod' (defaults to CARDANO_NETWORK env var)
 */
export function getPoolScriptAddress(
  network: 'mainnet' | 'preview' | 'preprod' = CARDANO_NETWORK
): string {
  return POOL_SCRIPT_ADDRESSES[network] || POOL_SCRIPT_ADDRESSES.preview;
}

/**
 * Get the current network configuration
 */
export function getNetwork(): 'mainnet' | 'preview' | 'preprod' {
  return CARDANO_NETWORK;
}

/**
 * Encode pool datum to CBOR-compatible format for MeshJS
 * PHASE 1.3: Updated to include withdrawnCommitments field
 */
export function encodePoolDatum(datum: PoolDatum): object {
  return {
    constructor: 0,
    fields: [
      datum.admin, // VerificationKeyHash as hex bytes
      datum.epochId,
      datum.epochEnd,
      Number(datum.totalDeposited),
      datum.participantCount,
      datum.midnightRoot,
      { constructor: datum.status, fields: [] }, // PoolStatus enum
      datum.stakePoolId,
      Number(datum.yieldAmount),
      datum.winnerCommitment,
      datum.withdrawalCount,
      datum.winnerWithdrawn ? { constructor: 1, fields: [] } : { constructor: 0, fields: [] },
      datum.withdrawnCommitments, // PHASE 1.3: List of withdrawn commitments
    ],
  };
}

/**
 * Encode redeemer to CBOR-compatible format for MeshJS
 * PHASE 1.3: Updated WithdrawWinner and WithdrawLoser to include commitment
 */
export function encodePoolRedeemer(redeemer: PoolRedeemer): object {
  switch (redeemer.type) {
    case 'Deposit':
      return {
        constructor: 0,
        fields: [redeemer.commitment, Number(redeemer.amount)],
      };
    case 'InitiateStaking':
      return { constructor: 1, fields: [] };
    case 'UpdateYield':
      return {
        constructor: 2,
        fields: [Number(redeemer.newYield)],
      };
    case 'FinalizeEpoch':
      return {
        constructor: 3,
        fields: [redeemer.winnerCommitment, redeemer.winnerProof],
      };
    case 'WithdrawWinner':
      // PHASE 1.3: Now includes commitment for replay protection
      return {
        constructor: 4,
        fields: [redeemer.commitment, redeemer.midnightProof],
      };
    case 'WithdrawLoser':
      // PHASE 1.3: Now includes commitment for replay protection
      return {
        constructor: 5,
        fields: [redeemer.commitment, redeemer.midnightProof],
      };
    case 'ClosePool':
      return { constructor: 6, fields: [] };
  }
}

/**
 * Decode pool datum from blockchain data
 * PHASE 1.3: Updated to include withdrawnCommitments
 */
export function decodePoolDatum(cbor: any): PoolDatum {
  const fields = cbor.fields;
  return {
    admin: fields[0],
    epochId: Number(fields[1]),
    epochEnd: Number(fields[2]),
    totalDeposited: BigInt(fields[3]),
    participantCount: Number(fields[4]),
    midnightRoot: fields[5],
    status: fields[6].constructor as PoolStatus,
    stakePoolId: fields[7],
    yieldAmount: BigInt(fields[8]),
    winnerCommitment: fields[9],
    withdrawalCount: Number(fields[10]),
    winnerWithdrawn: fields[11].constructor === 1,
    withdrawnCommitments: fields[12] || [], // PHASE 1.3: List of withdrawn commitments
  };
}

/**
 * Create initial pool datum for a new epoch
 * PHASE 1.3: Updated to include empty withdrawnCommitments array
 */
export function createInitialPoolDatum(
  adminPkh: string,
  epochId: number,
  epochEndTime: number,
  stakePoolId: string,
  midnightRoot: string = ''
): PoolDatum {
  return {
    admin: adminPkh,
    epochId,
    epochEnd: epochEndTime,
    totalDeposited: BigInt(0),
    participantCount: 0,
    midnightRoot: midnightRoot || ''.padEnd(64, '0'),
    status: PoolStatus.Collecting,
    stakePoolId,
    yieldAmount: BigInt(0),
    winnerCommitment: '',
    withdrawalCount: 0,
    winnerWithdrawn: false,
    withdrawnCommitments: [], // PHASE 1.3: Start with empty list
  };
}

/**
 * Minimum deposit in lovelace (from environment config or default 10 ADA)
 */
export const MIN_DEPOSIT_LOVELACE = BigInt(MIN_DEPOSIT_ADA * LOVELACE_PER_ADA);

/**
 * Validate deposit amount
 */
export function isValidDepositAmount(lovelace: bigint): boolean {
  return lovelace >= MIN_DEPOSIT_LOVELACE;
}

/**
 * Calculate winner's withdrawal amount
 * Includes division-by-zero protection
 */
export function calculateWinnerAmount(datum: PoolDatum): bigint {
  if (datum.participantCount === 0) {
    return BigInt(0);
  }
  const depositPerParticipant = datum.totalDeposited / BigInt(datum.participantCount);
  return depositPerParticipant + datum.yieldAmount;
}

/**
 * Calculate loser's withdrawal amount (principal only)
 * Includes division-by-zero protection
 */
export function calculateLoserAmount(datum: PoolDatum): bigint {
  if (datum.participantCount === 0) {
    return BigInt(0);
  }
  return datum.totalDeposited / BigInt(datum.participantCount);
}

/**
 * Check if an address is the admin address
 */
export function isAdminAddress(address: string): boolean {
  return ADMIN_ADDRESS !== '' && address === ADMIN_ADDRESS;
}

/**
 * Log debug information if debug mode is enabled
 */
export function debugLog(message: string, data?: unknown): void {
  if (DEBUG_MODE) {
    console.log(`[StakeDrop Debug] ${message}`, data ?? '');
  }
}

// Re-export for convenience
export { POOL_VALIDATOR_CBOR };
