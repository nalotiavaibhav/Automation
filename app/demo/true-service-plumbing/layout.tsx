import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'True Service Plumbing — AI Receptionist Demo',
  description:
    'See how our AI receptionist handles calls, books appointments, and recovers missed revenue for True Service Plumbing.',
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
