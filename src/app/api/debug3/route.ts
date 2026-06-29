import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pubkey = 'GCAESNE4G2KSYL5JBBUL3JGTTWHO54ALPWDYZR3C2W2R2UVDJYNOUWNW';
    const res = await fetch(`http://localhost:3000/api/users/${pubkey}/history?t=${Date.now()}`);
    const status = res.status;
    const text = await res.text();
    
    return NextResponse.json({
      http_status: status,
      response_text: text,
      pubkey_used: pubkey
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
