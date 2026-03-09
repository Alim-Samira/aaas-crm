// app/layout.tsx
//    FIX DEFINITIF : export dynamic = 'force-dynamic'
// Sans ça, Next.js tente de prerendre toutes les pages au BUILD TIME
// → Supabase crash car NEXT_PUBLIC_SUPABASE_URL n'existe pas au build
// → "Your project's URL and API key are required" sur toutes les pages
// force-dynamic = pages rendues à la demande uniquement (jamais au build)

import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

//    LA LIGNE QUI RÈGLE TOUT — ne jamais retirer
export const dynamic = 'force-dynamic';

const displayFont = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const bodyFont = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CRM SaaS — Gestion Relation Client',
  description: 'Application CRM full SaaS Next.js 14 + Supabase + Brevo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${displayFont.variable} ${bodyFont.variable}`}>
      {/*
       * suppressHydrationWarning ← fixes "Extra attributes from the server"
       * Browser extensions inject attributes like `data-smart-converter-loaded`
       * into <body> after server render, causing React hydration mismatch.
       * This prop tells React to skip attribute comparison on <body> only.
       */}
      <body
        className="font-body bg-[#080d1a] text-slate-100 antialiased overflow-x-hidden"
        suppressHydrationWarning
      >
        {/* Ambient mesh gradient background */}
        <div
          aria-hidden
          className="fixed inset-0 -z-10"
          style={{
            background: `
              radial-gradient(at 40% 20%, rgba(99,102,241,0.25) 0px, transparent 50%),
              radial-gradient(at 80% 0%,  rgba(139,92,246,0.15) 0px, transparent 50%),
              radial-gradient(at 0%  50%, rgba(6,182,212,0.12)  0px, transparent 50%),
              radial-gradient(at 80% 50%, rgba(236,72,153,0.08) 0px, transparent 50%),
              radial-gradient(at 0% 100%, rgba(99,102,241,0.15) 0px, transparent 50%),
              #080d1a
            `,
          }}
        />

        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}