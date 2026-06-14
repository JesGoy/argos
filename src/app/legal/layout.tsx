import type { ReactNode } from 'react';
import Link from 'next/link';
import { APP_ROUTE } from '@/config/routes';

const LEGAL_LINKS = [
  { href: APP_ROUTE.TERMS, label: 'Términos' },
  { href: APP_ROUTE.PRIVACY, label: 'Privacidad' },
  { href: APP_ROUTE.DPA, label: 'DPA' },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href={APP_ROUTE.LOGIN} className="text-lg font-bold text-gray-900">
            Argos
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-gray-600 hover:text-gray-900">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <article className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {children}
        </article>
      </main>
    </div>
  );
}
