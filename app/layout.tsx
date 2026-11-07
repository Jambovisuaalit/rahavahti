import './style.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Rahavahti — kehitysesikatselu', description: 'Suomenkielinen talousauditoinnin kehitysesikatselu; ei tuotantokäyttöön' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="fi"><body>{children}</body></html>; }
