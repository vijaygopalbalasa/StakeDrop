import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum PoolStatus { OPEN = 0, LOCKED = 1, DISTRIBUTED = 2 }

export type Witnesses<T> = {
  localSecret(context: __compactRuntime.WitnessContext<Ledger, T>): [T, Uint8Array];
  localAmountBytes(context: __compactRuntime.WitnessContext<Ledger, T>): [T, Uint8Array];
}

export type ImpureCircuits<T> = {
  initializeEpoch(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  registerDeposit(context: __compactRuntime.CircuitContext<T>,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  lockPool(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  declareWinner(context: __compactRuntime.CircuitContext<T>,
                winner_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  proveWinner(context: __compactRuntime.CircuitContext<T>,
              commitment_0: Uint8Array): __compactRuntime.CircuitResults<T, Uint8Array>;
  proveLoser(context: __compactRuntime.CircuitContext<T>,
             commitment_0: Uint8Array): __compactRuntime.CircuitResults<T, Uint8Array>;
  markDistributed(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
}

export type PureCircuits = {
  computeCommitment(secret_0: Uint8Array, amount_0: Uint8Array): Uint8Array;
}

export type Circuits<T> = {
  initializeEpoch(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  computeCommitment(context: __compactRuntime.CircuitContext<T>,
                    secret_0: Uint8Array,
                    amount_0: Uint8Array): __compactRuntime.CircuitResults<T, Uint8Array>;
  registerDeposit(context: __compactRuntime.CircuitContext<T>,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  lockPool(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  declareWinner(context: __compactRuntime.CircuitContext<T>,
                winner_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  proveWinner(context: __compactRuntime.CircuitContext<T>,
              commitment_0: Uint8Array): __compactRuntime.CircuitResults<T, Uint8Array>;
  proveLoser(context: __compactRuntime.CircuitContext<T>,
             commitment_0: Uint8Array): __compactRuntime.CircuitResults<T, Uint8Array>;
  markDistributed(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
}

export type Ledger = {
  readonly epochId: bigint;
  readonly poolStatus: PoolStatus;
  readonly participantCount: bigint;
  readonly winnerCommitment: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;
