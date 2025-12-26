import { NextRequest, NextResponse } from 'next/server';

// Server-side only - not exposed to client
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('RPC proxy error:', error);
        return NextResponse.json({ error: 'RPC request failed' }, { status: 500 });
    }
}
