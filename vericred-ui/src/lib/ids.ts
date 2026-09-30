// VeriCred — identity + hashing helpers for demo credential data.
// Deterministic where it matters (display ids), random where it should be (tx hashes).

const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function fnv1a32(input: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Stable base36-ish group encoding for display ids. */
function encode(value: string, len: number, seed: number): string {
  let h = fnv1a32(value, seed);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[h % ALPHABET.length];
    h = Math.floor(h / ALPHABET.length) ^ fnv1a32(out, seed + i);
    h = h >>> 0;
  }
  return out;
}

export function credentialDisplayId(seedString: string): string {
  return `VC-${encode(seedString, 4, 17)}-${encode(seedString, 4, 91)}`;
}

export function proofVerificationId(seedString: string): string {
  return `VP-${encode(seedString, 4, 31)}-${encode(seedString, 4, 77)}`;
}

/** SHA-256 hex when available (browsers + node 20+), FNV fallback for legacy engines. */
export async function sha256Hex(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let out = '';
  for (let i = 0; i < 8; i++)
    out += fnv1a32(input, i * 0x9e37 + 1)
      .toString(16)
      .padStart(8, '0');
  return out.slice(0, 64);
}

export function randomHashHex(len = 64): string {
  let out = '';
  while (out.length < len) out += Math.random().toString(16).slice(2);
  return out.slice(0, len);
}

export function truncatedHash(hex: string, head = 10, tail = 6): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length <= head + tail) return `0x${clean}`;
  return `0x${clean.slice(0, head)}…${clean.slice(-tail)}`;
}

export function shortId(id: string): string {
  return id.length <= 14 ? id : `${id.slice(0, 10)}…${id.slice(-2)}`;
}

/** 32-byte deterministic hash of an arbitrary label (used for degree / course id hashes). */
export async function labelToBytes32Hex(label: string): Promise<string> {
  const hex = await sha256Hex(label.toLowerCase().trim());
  return `0x${hex}`;
}
