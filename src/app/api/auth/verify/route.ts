import { NextResponse } from 'next/server';
import { verifyWalletSignature } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { publicKey, signature, timestamp, signedPayload } = await req.json();

    if (!publicKey || !signature || !timestamp) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!verifyWalletSignature(publicKey, signature, Number(timestamp), signedPayload)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    return NextResponse.json({ verified: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
