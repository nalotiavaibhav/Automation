'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Kanban,
  Users,
  Phone,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/calls', label: 'Calls', icon: Phone },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around ag-glass-heavy rounded-t-2xl px-2 py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] md:hidden">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all duration-300',
              isActive
                ? 'text-flowmax-accent'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            {isActive && (
              <span className="absolute inset-x-1 -inset-y-0.5 rounded-xl bg-flowmax-accent/10" />
            )}
            <Icon
              className={cn(
                'relative h-5 w-5 transition-all duration-300',
                isActive ? 'text-flowmax-accent' : 'text-gray-400'
              )}
              style={
                isActive
                  ? {
                      filter:
                        'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))',
                    }
                  : undefined
              }
            />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
