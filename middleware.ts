import { NextRequest, NextResponse } from 'next/server';

/**
 * Strict script CSP for the public, synthetic-data-only preview.
 * The nonce is generated for every request and propagated to Next.js rendering.
 * Do not treat this as authorization for processing real financial information.
 */
export function middleware(request: NextRequest) {
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
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({request:{headers:requestHeaders}});
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control','no-store, max-age=0');
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
