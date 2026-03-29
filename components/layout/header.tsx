'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pipeline': 'Pipeline',
  '/contacts': 'Contacts',
  '/calls': 'Call Logs',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return title;
    }
  }
  return 'Dashboard';
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between ag-glass-heavy px-6 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]">
      {/* Left: Page title */}
      <h1 className="text-lg font-semibold text-gray-900 ag-enter">{title}</h1>

      {/* Right: Search + Notification + Avatar */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="group relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors duration-300 group-focus-within:text-flowmax-accent" />
          <Input
            type="search"
            placeholder="Search calls, contacts..."
            className="h-9 w-64 rounded-full bg-white/50 pl-9 text-sm transition-all duration-300 border-white/40 focus-visible:ring-flowmax-accent focus-visible:bg-white/80 focus-visible:shadow-[0_0_20px_rgba(245,158,11,0.12)]"
          />
        </div>

        {/* Notification bell */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-all duration-300 hover:bg-white/60 hover:text-gray-700 hover:scale-110 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-flowmax-accent shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
        </button>

        {/* Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-flowmax-navy to-flowmax-navy-light text-xs font-semibold text-white ring-2 ring-white/20 transition-transform duration-300 hover:scale-105">
          VN
        </div>
      </div>
    </header>
  );
}
