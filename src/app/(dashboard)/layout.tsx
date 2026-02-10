import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import { DashboardNav } from '@/components/DashboardNav';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardNav session={session} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
