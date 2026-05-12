import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { source } from '@/lib/source';

export default function DocsRouteLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: (
            <span className="font-semibold tracking-tight">
              Flow<span className="text-flowmax-accent">max</span> Docs
            </span>
          ),
        }}
        links={[
          { text: 'Back to app', url: '/dashboard', external: false },
        ]}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
