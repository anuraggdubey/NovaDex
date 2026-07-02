import { NextResponse } from 'next/server';
import { verifyWalletSignature, isValidStellarPublicKey } from '@/lib/auth';

export function extractWalletAuth(req: Request) {
  return {
    publicKey: req.headers.get('x-nd-pubkey') || '',
    signature: req.headers.get('x-nd-signature') || '',
    timestamp: parseInt(req.headers.get('x-nd-timestamp') || '0', 10),
    signedPayload: req.headers.get('x-nd-signed-payload') || undefined,
  };
}

export function requireWalletAuth(req: Request, routePubkey: string): NextResponse | null {
  const { publicKey, signature, timestamp, signedPayload } = extractWalletAuth(req);

  if (!isValidStellarPublicKey(routePubkey)) {
    return NextResponse.json({ error: 'Invalid pubkey' }, { status: 400 });
  }

  if (publicKey !== routePubkey) {
    return NextResponse.json({ error: 'Pubkey mismatch' }, { status: 403 });
  }

  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Wallet signature required' }, { status: 401 });
  }

  if (!verifyWalletSignature(publicKey, signature, timestamp, signedPayload)) {
    return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 });
  }

  return null;
}
