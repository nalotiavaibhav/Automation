'use client';

import { usePathname } from 'next/navigation';
import { MotionConfig } from 'motion/react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic =
    pathname.startsWith('/demo/') || pathname.startsWith('/docs');

  if (isPublic) return <>{children}</>;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen overflow-hidden ag-perspective">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto ag-mesh-bg p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </MotionConfig>
  );
}
