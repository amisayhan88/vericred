// VeriCred - Confidential Academic Credentials Contract Unit Tests
// Copyright (C) Midnight Foundation & VeriCred Protocol
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { createCacPrivateState, cacWitnesses } from '../cac-witnesses.js';
import { CredentialStatus } from '../managed/cac/contract/index.js';

describe('VeriCred Compact Smart Contract', () => {
  it('initializes private state and witnesses correctly', () => {
    const secretKey = new Uint8Array(32).fill(7);
    const degreeHash = new Uint8Array(32).fill(42);
    const privateState = createCacPrivateState(secretKey, 390, degreeHash);

    expect(privateState.secretKey).toEqual(secretKey);
    expect(privateState.studentGpaScaled).toBe(390);
    expect(privateState.degreeIdHash).toEqual(degreeHash);
  });

  it('validates credential status enum values', () => {
    expect(CredentialStatus.UNISSUED).toBeDefined();
    expect(CredentialStatus.VALID).toBeDefined();
    expect(CredentialStatus.SUSPENDED).toBeDefined();
    expect(CredentialStatus.REVOKED).toBeDefined();
  });

  it('proves GPA threshold witness evaluation in private state', () => {
    const secretKey = new Uint8Array(32).fill(12);
    const degreeHash = new Uint8Array(32).fill(99);
    const privateState = createCacPrivateState(secretKey, 385, degreeHash);

    const gpaWitness = cacWitnesses.studentGpaScaled({ privateState } as any);

    expect(gpaWitness[0]).toBe(privateState);
    expect(gpaWitness[1]).toBe(385n);
    expect(gpaWitness[1]).toBeGreaterThanOrEqual(350n); // GPA >= 3.50
  });

  it('evaluates local secret key witness securely', () => {
    const secretKey = new Uint8Array(32).fill(101);
    const degreeHash = new Uint8Array(32).fill(202);
    const privateState = createCacPrivateState(secretKey, 395, degreeHash);

    const secretKeyWitness = cacWitnesses.localSecretKey({ privateState } as any);

    expect(secretKeyWitness[0]).toBe(privateState);
    expect(secretKeyWitness[1]).toEqual(secretKey);
    expect(secretKeyWitness[1].length).toBe(32);
  });

  it('evaluates degree ID hash witness for ZK matching', () => {
    const secretKey = new Uint8Array(32).fill(15);
    const degreeHash = new Uint8Array(32).fill(88);
    const privateState = createCacPrivateState(secretKey, 375, degreeHash);

    const degreeWitness = cacWitnesses.degreeIdHash({ privateState } as any);

    expect(degreeWitness[0]).toBe(privateState);
    expect(degreeWitness[1]).toEqual(degreeHash);
    expect(degreeWitness[1].length).toBe(32);
  });
});
