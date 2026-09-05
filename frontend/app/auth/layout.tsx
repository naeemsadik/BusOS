'use client';

import { AppHeader } from '@/components/app-header';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">{children}</div>
    </>
  );
}
