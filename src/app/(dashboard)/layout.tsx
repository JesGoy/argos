import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return <>{children}</>;
}
