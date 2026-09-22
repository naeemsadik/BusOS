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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_35%),radial-gradient(circle_at_bottom_right,hsl(var(--accent-foreground)/0.12),transparent_32%)]">{children}</div>
    </>
  );
}
