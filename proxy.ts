import { NextResponse, type NextRequest } from "next/server";
import { auth } from "./lib/auth/server";

/** Next.js 16: one proxy composes Neon Auth and per-request CSP. */
const authProxy = auth.middleware({ loginUrl: "/auth/sign-in" });
const PUBLIC_PAGES = new Set(["/", "/luotonantajat", "/korkovertailu", "/inflaatio"]);

export default async function proxy(request: NextRequest) {
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
  ].join("; ");
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);
  const response = PUBLIC_PAGES.has(request.nextUrl.pathname)
    ? NextResponse.next({ request: { headers: request.headers } })
    : await authProxy(request);
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
