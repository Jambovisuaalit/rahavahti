import { NextResponse } from 'next/server';

// Explicitly deny all credit-record API access until identity, tenant isolation,
// storage rules, consent and privacy approval exist. No data is read or written.
const deny = () => NextResponse.json(
  { error: 'CREDIT_RECORD_ACCESS_DISABLED', message: 'Palvelu on HOLD-tilassa.' },
  { status: 403, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
);
export const GET = deny;
export const POST = deny;
export const PUT = deny;
export const PATCH = deny;
export const DELETE = deny;
