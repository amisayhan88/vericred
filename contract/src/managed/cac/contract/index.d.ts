import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum CredentialStatus { UNISSUED = 0,
                               VALID = 1,
                               SUSPENDED = 2,
                               REVOKED = 3
}

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  studentGpaScaled(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  degreeIdHash(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  proveGpaThreshold(context: __compactRuntime.CircuitContext<PS>,
                    credentialHash_0: Uint8Array,
                    minGpaScaled_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  proveDegreeMatch(context: __compactRuntime.CircuitContext<PS>,
                   credentialHash_0: Uint8Array,
                   expectedDegreeHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  suspendCredential(context: __compactRuntime.CircuitContext<PS>,
                    credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  reinstateCredential(context: __compactRuntime.CircuitContext<PS>,
                      credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  batchIssueCredentials(context: __compactRuntime.CircuitContext<PS>,
                        hash1_0: Uint8Array,
                        hash2_0: Uint8Array,
                        hash3_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  proveGpaThreshold(context: __compactRuntime.CircuitContext<PS>,
                    credentialHash_0: Uint8Array,
                    minGpaScaled_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  proveDegreeMatch(context: __compactRuntime.CircuitContext<PS>,
                   credentialHash_0: Uint8Array,
                   expectedDegreeHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  suspendCredential(context: __compactRuntime.CircuitContext<PS>,
                    credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  reinstateCredential(context: __compactRuntime.CircuitContext<PS>,
                      credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  batchIssueCredentials(context: __compactRuntime.CircuitContext<PS>,
                        hash1_0: Uint8Array,
                        hash2_0: Uint8Array,
                        hash3_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  getCredentialCount(): boolean;
  publicKey(sk_0: Uint8Array, sequence_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  proveGpaThreshold(context: __compactRuntime.CircuitContext<PS>,
                    credentialHash_0: Uint8Array,
                    minGpaScaled_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  proveDegreeMatch(context: __compactRuntime.CircuitContext<PS>,
                   credentialHash_0: Uint8Array,
                   expectedDegreeHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  suspendCredential(context: __compactRuntime.CircuitContext<PS>,
                    credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  reinstateCredential(context: __compactRuntime.CircuitContext<PS>,
                      credentialHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  batchIssueCredentials(context: __compactRuntime.CircuitContext<PS>,
                        hash1_0: Uint8Array,
                        hash2_0: Uint8Array,
                        hash3_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  getCredentialCount(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
  publicKey(context: __compactRuntime.CircuitContext<PS>,
            sk_0: Uint8Array,
            sequence_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly totalCredentialsIssued: bigint;
  readonly institutionOwner: Uint8Array;
  credentialStatus: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): CredentialStatus;
    [Symbol.iterator](): Iterator<[Uint8Array, CredentialStatus]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
