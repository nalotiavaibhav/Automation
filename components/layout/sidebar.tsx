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
  { href: '/calls', label: 'Call Logs', icon: Phone },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-gradient-to-b from-flowmax-navy-light to-flowmax-navy text-white">
      {/* Logo */}
      <div className="flex items-center gap-1 px-6 py-6">
        <span className="text-2xl font-bold tracking-tight text-white">
          Flow
        </span>
        <span className="text-2xl font-bold tracking-tight text-flowmax-accent">
          max
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 mt-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'border-l-2 border-flowmax-accent bg-white/10 text-white'
                  : 'border-l-2 border-transparent text-white/60 hover:translate-x-1 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-all duration-200',
                  isActive
                    ? 'text-flowmax-accent'
                    : 'text-white/40 group-hover:scale-110 group-hover:text-white/80'
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-xs text-white/30">Made by Vaibhav</p>
      </div>
    </aside>
  );
}
