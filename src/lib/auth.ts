/**
 * Signature-based wallet authentication.
 * No JWT tokens, no sessions. Pure wallet ownership proof.
 * As documented in Section 6: "Row Level Security" and Section 8.
 */

import { verifySignature, buildAuthChallenge } from './stellar';

const AUTH_WINDOW_MS = 5 * 60 * 1000; // 5-minute validity window for challenge

/**
 * Verifies a Freighter wallet signature.
 * The message must be: "NovaDEX auth: {timestamp} {publicKey}"
 * The timestamp must be within AUTH_WINDOW_MS of current time.
 *
 * @returns true if the signature is valid and the timestamp is fresh
 */
export function verifyWalletSignature(
  publicKey: string,
  signature: string,
  timestamp: number
): boolean {
  // Reject stale challenges (prevents replay attacks)
  const now = Date.now();
  if (Math.abs(now - timestamp) > AUTH_WINDOW_MS) {
    return false;
  }

  const message = buildAuthChallenge(publicKey, timestamp);
  return verifySignature(publicKey, message, signature);
}

/**
 * Validates that a string looks like a valid Stellar public key.
 * Must be 56 characters, start with G, and be a valid base32 string.
 */
export function isValidStellarPublicKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.length !== 56 || key[0] !== 'G') return false;
  // Basic base32 character check
  return /^[A-Z2-7]{56}$/.test(key);
}
