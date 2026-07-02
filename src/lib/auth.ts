/**
 * Signature-based wallet authentication.
 * No JWT tokens, no sessions. Pure wallet ownership proof.
 * As documented in Section 6: "Row Level Security" and Section 8.
 */

import { verifySignature, buildAuthChallenge } from './stellar';
import * as StellarSdk from '@stellar/stellar-sdk';

const AUTH_WINDOW_MS = 5 * 60 * 1000; // 5-minute validity window for challenge

/**
 * Verifies a Freighter wallet signature.
 * The message must be: "NovaDEX auth: {timestamp} {publicKey}"
 * The timestamp must be within AUTH_WINDOW_MS of current time.
 *
 * @returns true if the signature is valid and the timestamp is fresh
 */
function decodeSignatureBuffer(signature: string): Buffer {
  const trimmed = signature.trim();
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return Buffer.from(trimmed, 'base64');
}

export function verifyWalletSignature(
  publicKey: string,
  signature: string,
  timestamp: number,
  signedPayload?: string,
): boolean {
  const now = Date.now();
  if (Math.abs(now - timestamp) > AUTH_WINDOW_MS) {
    return false;
  }

  const message = buildAuthChallenge(publicKey, timestamp);
  if (verifySignature(publicKey, message, signature)) {
    return true;
  }

  if (signedPayload) {
    try {
      const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
      const payloadBytes = Buffer.from(signedPayload, 'hex');
      const signatureBytes = decodeSignatureBuffer(signature);
      return keypair.verify(payloadBytes, signatureBytes);
    } catch {
      return false;
    }
  }

  return false;
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
