/**
 * Signature-based wallet authentication.
 * No JWT tokens, no sessions. Pure wallet ownership proof.
 *
 * Wallet formats:
 * - Freighter: SEP-53 (SHA256 of "Stellar Signed Message:\n" + challenge)
 * - Albedo: SHA256 of "{publicKey}:{challenge}", with signed_message = hex(utf8 payload)
 */

import { createHash } from 'crypto';
import { verifySignature, buildAuthChallenge } from './stellar';
import * as StellarSdk from '@stellar/stellar-sdk';

const AUTH_WINDOW_MS = 5 * 60 * 1000; // 5-minute validity window for challenge
const SEP53_PREFIX = 'Stellar Signed Message:\n';

function decodeSignatureBuffer(signature: string): Buffer {
  const trimmed = signature.trim();
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return Buffer.from(trimmed, 'base64');
}

function buildAlbedoMessageToSign(publicKey: string, message: string): string {
  return `${publicKey}:${message}`;
}

/** Freighter / SEP-53 wallets sign SHA256(prefix + utf8 message). */
function verifySep53Message(publicKey: string, message: string, signature: string): boolean {
  try {
    const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
    const prefix = Buffer.from(SEP53_PREFIX, 'utf8');
    const messageBytes = Buffer.from(message, 'utf8');
    const payload = Buffer.concat([prefix, messageBytes]);
    const hash = createHash('sha256').update(payload).digest();
    const signatureBytes = decodeSignatureBuffer(signature);
    return signatureBytes.length === 64 && keypair.verify(hash, signatureBytes);
  } catch {
    return false;
  }
}

/**
 * Albedo signs SHA256(utf8 "{publicKey}:{message}") and returns:
 * - signed_message: hex-encoded utf8 of "{publicKey}:{message}"
 * - message_signature: hex-encoded ed25519 signature of the hash
 * @see https://github.com/stellar-expert/albedo/blob/master/frontend/src/actions/action-authentication-context.js
 */
function verifyAlbedoAuthSignature(
  publicKey: string,
  message: string,
  signature: string,
  signedPayload?: string,
): boolean {
  try {
    const messageToSign = buildAlbedoMessageToSign(publicKey, message);
    if (signedPayload) {
      const decoded = Buffer.from(signedPayload, 'hex').toString('utf8');
      if (decoded !== messageToSign) {
        return false;
      }
    }
    const hash = createHash('sha256').update(messageToSign, 'utf8').digest();
    const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
    const signatureBytes = decodeSignatureBuffer(signature);
    return signatureBytes.length === 64 && keypair.verify(hash, signatureBytes);
  } catch {
    return false;
  }
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

  if (signedPayload && verifyAlbedoAuthSignature(publicKey, message, signature, signedPayload)) {
    return true;
  }

  if (verifySep53Message(publicKey, message, signature)) {
    return true;
  }

  if (verifyAlbedoAuthSignature(publicKey, message, signature)) {
    return true;
  }

  if (verifySignature(publicKey, message, signature)) {
    return true;
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
  return /^[A-Z2-7]{56}$/.test(key);
}
