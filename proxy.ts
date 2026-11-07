import { NextRequest, NextResponse } from 'next/server';
import { auth } from './lib/auth/server';

// Next.js 16 permits one proxy entrypoint. Preserve Neon's session and cookie
// handling, then attach the same request-specific CSP used in the earlier
// middleware.ts implementation.
const authProxy = auth.middleware({ loginUrl: '/auth/sign-in' });

export default async function proxy(request: NextRequest) {
  // Public pages show only in-memory synthetic financial examples. Keep all
  // dashboard and account endpoints behind the Neon session layer.
  const publicPreviewRoutes = new Set(['/', '/budjetti', '/luotonantajat', '/korkolaskuri', '/velkasuunnitelma']);
  const publicApiRoutes = new Set(['/api/private/credit-records']);
  const path = request.nextUrl.pathname.replace(/\/$/, '') || '/';
  const publicPreview = publicPreviewRoutes.has(path) || publicApiRoutes.has(path);
  const result = publicPreview ? NextResponse.next() : await authProxy(request);
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...bytes));
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "upgrade-insecure-requests",
  ].join('; ');

  // Preserve the auth middleware's redirect, Set-Cookie and other headers.
  // Next.js reads request CSP to infer its nonce for server-rendered scripts.
  // The x-middleware-request-* convention forwards the resulting request header.
  const forwarded = new Set(
    (result.headers.get('x-middleware-override-headers') ?? '')
      .split(',').map(x => x.trim()).filter(Boolean)
  );
  forwarded.add('content-security-policy');
  forwarded.add('x-nonce');
  result.headers.set('x-middleware-override-headers', [...forwarded].join(','));
  result.headers.set('x-middleware-request-content-security-policy', csp);
  result.headers.set('x-middleware-request-x-nonce', nonce);
  result.headers.set('Content-Security-Policy', csp);
  result.headers.set('Cache-Control', 'no-store, max-age=0');
  return result;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
