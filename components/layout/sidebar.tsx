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
    <aside className="hidden md:flex w-64 flex-col bg-gradient-to-b from-flowmax-navy-light to-flowmax-navy text-white relative overflow-hidden">
      {/* Subtle radial light overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)',
        }}
      />

      {/* Logo */}
      <div className="flex items-center gap-1 px-6 py-6 relative z-10">
        <div
          className="flex items-center gap-1"
          style={{
            animation: 'ag-logo-float 6s ease-in-out infinite',
            willChange: 'transform',
          }}
        >
          <span className="text-2xl font-bold tracking-tight text-white">
            Flow
          </span>
          <span
            className="text-2xl font-bold tracking-tight text-flowmax-accent"
            style={{ textShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}
          >
            max
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 mt-2 relative z-10">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300',
                isActive
                  ? 'bg-white/10 text-white backdrop-blur-sm'
                  : 'text-white/60 hover:translate-x-1 hover:bg-white/[0.06] hover:text-white'
              )}
              style={
                isActive
                  ? {
                      boxShadow:
                        '0 0 15px rgba(245, 158, 11, 0.12), inset 0 0 15px rgba(245, 158, 11, 0.04)',
                    }
                  : undefined
              }
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-all duration-300',
                  isActive
                    ? 'text-flowmax-accent'
                    : 'text-white/40 group-hover:scale-110 group-hover:text-white/80'
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative px-6 py-4">
        <div
          className="absolute top-0 left-4 right-4 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(245, 158, 11, 0.2), transparent)',
          }}
        />
        <p className="text-xs text-white/30">Made by Vaibhav</p>
      </div>
    </aside>
  );
}
