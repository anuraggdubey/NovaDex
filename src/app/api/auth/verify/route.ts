import { NextRequest, NextResponse } from 'next/server';
import { verifyWalletSignature, isValidStellarPublicKey } from '@/lib/auth';

// POST /api/auth/verify
// Verifies a Freighter wallet signature for sensitive operations.
// Message format: "NovaDEX auth: {timestamp} {publicKey}"
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicKey, signature, timestamp } = body;

    if (!publicKey || !isValidStellarPublicKey(publicKey)) {
      return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
    }
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature or timestamp' }, { status: 400 });
    }

    const isValid = verifyWalletSignature(publicKey, signature, Number(timestamp));

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    return NextResponse.json({ verified: true, publicKey });
  } catch (error) {
    console.error('/api/auth/verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
