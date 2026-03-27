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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur-md">
      {/* Left: Page title */}
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      {/* Right: Search + Notification + Avatar */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search calls, contacts..."
            className="h-9 w-64 rounded-full border-gray-200 bg-gray-50 pl-9 text-sm focus-visible:ring-flowmax-accent"
          />
        </div>

        {/* Notification bell */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-flowmax-accent" />
        </button>

        {/* Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-flowmax-navy to-flowmax-navy-light text-xs font-semibold text-white">
          VN
        </div>
      </div>
    </header>
  );
}
