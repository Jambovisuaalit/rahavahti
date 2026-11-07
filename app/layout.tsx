import './style.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

export const metadata: Metadata = { title: 'Rahavahti — kehitysesikatselu', description: 'Suomenkielinen talousauditoinnin kehitysesikatselu; ei tuotantokäyttöön' };

// Dynamic server rendering allows Next.js to nonce its own hydration scripts
// against the request-specific enforced Content-Security-Policy.
export default async function Layout({children}:{children:React.ReactNode}) {
  await headers();
  return <html lang="fi"><body>{children}</body></html>;
}
