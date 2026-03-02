// Cloudflare Worker — lightweight CORS proxy for RadioReference SOAP API
// Only proxies to api.radioreference.com to prevent abuse as an open proxy.

const ALLOWED_ORIGINS = [
  'https://api.radioreference.com',
  'https://database.radioid.net',
];
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, SOAPAction',
};

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Get the target URL from the ?url= parameter
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400, headers: CORS_HEADERS });
    }

    // Only allow known APIs
    if (!ALLOWED_ORIGINS.some(origin => target.startsWith(origin))) {
      return new Response('Target URL not allowed', { status: 403, headers: CORS_HEADERS });
    }

    // Forward the request
    const proxyRes = await fetch(target, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'text/xml',
        'SOAPAction': request.headers.get('SOAPAction') || '',
      },
      body: request.method === 'POST' ? await request.text() : undefined,
    });

    // Return response with CORS headers
    // Always return 200 — SOAP faults come as HTTP 500 upstream but the
    // client needs to parse the XML body to extract fault messages.
    const body = await proxyRes.text();
    return new Response(body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': proxyRes.headers.get('Content-Type') || 'text/xml',
      },
    });
  },
};
