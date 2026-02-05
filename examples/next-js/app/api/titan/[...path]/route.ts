import { NextRequest, NextResponse } from 'next/server';

// Demo endpoints by region
const TITAN_DEMO_URLS: Record<string, string> = {
    us1: 'https://us1.api.demo.titan.exchange',
    jp1: 'https://jp1.api.demo.titan.exchange',
    de1: 'https://de1.api.demo.titan.exchange',
};

/**
 * Next.js API route proxy for Titan API.
 * Proxies all requests to Titan's API to work around CORS restrictions.
 *
 * Usage: /api/titan/api/v1/quote/swap?inputMint=...&region=us1
 *        → proxied to https://us1.api.demo.titan.exchange/api/v1/quote/swap?inputMint=...
 *
 * Environment:
 * - TITAN_API_TOKEN: Your Titan API JWT token (required for demo endpoints)
 *
 * Query params:
 * - region: 'us1' | 'jp1' | 'de1' (default: 'us1') - selects Titan endpoint
 * - ...all other params forwarded to Titan
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const titanPath = '/' + path.join('/');
    const searchParams = request.nextUrl.searchParams;

    // Extract region (used for routing, not forwarded)
    const region = searchParams.get('region') || 'us1';
    const baseUrl = TITAN_DEMO_URLS[region] || TITAN_DEMO_URLS.us1;

    // Build params to forward (exclude 'region')
    const forwardParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
        if (key !== 'region') {
            forwardParams.set(key, value);
        }
    });

    const url = forwardParams.toString() ? `${baseUrl}${titanPath}?${forwardParams}` : `${baseUrl}${titanPath}`;

    try {
        // Use server-side token from env, or forward client header as fallback
        const authToken = process.env.TITAN_API_TOKEN || request.headers.get('Authorization')?.replace('Bearer ', '');
        const headers: Record<string, string> = {
            Accept: 'application/msgpack',
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error(`Titan API error (${response.status}) at ${titanPath}:`, errorText);
            return new NextResponse(errorText, {
                status: response.status,
                headers: { 'Content-Type': 'text/plain' },
            });
        }

        // Return MessagePack binary response as-is
        const buffer = await response.arrayBuffer();
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/msgpack',
            },
        });
    } catch (error) {
        console.error('Titan API proxy error:', error);
        return new NextResponse(error instanceof Error ? error.message : 'Failed to proxy Titan request', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}
