'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  Settings,
  Play,
  Rocket,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/demo/true-service-plumbing', label: 'Live Demo', icon: Play },
  { href: '/onboarding', label: 'Onboarding', icon: Rocket },
  { href: '/docs', label: 'Docs', icon: BookOpen },
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
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'text-white'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-lg bg-white/10 backdrop-blur-sm"
                  style={{
                    boxShadow:
                      '0 0 15px rgba(245, 158, 11, 0.12), inset 0 0 15px rgba(245, 158, 11, 0.04)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                className={cn(
                  'relative h-5 w-5 shrink-0 transition-colors duration-200',
                  isActive
                    ? 'text-flowmax-accent'
                    : 'text-white/40 group-hover:text-white/80'
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
