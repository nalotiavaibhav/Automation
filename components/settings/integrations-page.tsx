'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Database,
  Wrench,
  Briefcase,
  LayoutGrid,
  Cloud,
  Home,
  Info,
  Loader2,
  Unplug,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CRM_PROVIDERS } from '@/lib/crm/providers';
import { CrmConnectDialog } from './crm-connect-dialog';
import { FieldMappingEditor } from './field-mapping-editor';
import type { CrmProvider, CrmConnectionStatus } from '@/types/crm';

/* ------------------------------------------------------------------ */
/*  Icon mapping                                                       */
/* ------------------------------------------------------------------ */

const CRM_ICONS: Record<CrmProvider, React.ElementType> = {
  hubspot: Database,
  servicetitan: Wrench,
  jobber: Briefcase,
  zoho: LayoutGrid,
  salesforce: Cloud,
  housecallpro: Home,
};

const CRM_ICON_COLORS: Record<CrmProvider, { bg: string; fg: string }> = {
  hubspot: { bg: 'bg-orange-100', fg: 'text-orange-600' },
  servicetitan: { bg: 'bg-red-100', fg: 'text-red-600' },
  jobber: { bg: 'bg-green-100', fg: 'text-green-600' },
  zoho: { bg: 'bg-yellow-100', fg: 'text-yellow-600' },
  salesforce: { bg: 'bg-blue-100', fg: 'text-blue-600' },
  housecallpro: { bg: 'bg-purple-100', fg: 'text-purple-600' },
};

/* ------------------------------------------------------------------ */
/*  Status hook (inline to keep single-component usage simple)         */
/* ------------------------------------------------------------------ */

function useCrmStatuses() {
  const [statuses, setStatuses] = useState<Record<string, CrmConnectionStatus>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const availableProviders = CRM_PROVIDERS.filter((p) => p.available);
    const results: Record<string, CrmConnectionStatus> = {};

    await Promise.all(
      availableProviders.map(async (provider) => {
        try {
          const res = await fetch(`/api/integrations/${provider.id}/status`);
          if (res.ok) {
            const data = await res.json();
            results[provider.id] = { provider: provider.id, ...data };
          } else {
            results[provider.id] = { provider: provider.id, connected: false };
          }
        } catch {
          results[provider.id] = { provider: provider.id, connected: false };
        }
      })
    );

    setStatuses(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { statuses, loading, refresh: fetchAll };
}

/* ------------------------------------------------------------------ */
/*  CRM Card                                                           */
/* ------------------------------------------------------------------ */

interface CrmCardProps {
  id: CrmProvider;
  name: string;
  description: string;
  features: string[];
  available: boolean;
  status: CrmConnectionStatus | undefined;
  statusLoading: boolean;
  onConnect: (provider: CrmProvider) => void;
  onDisconnect: (provider: CrmProvider) => void;
}

function CrmCard({
  id,
  name,
  description,
  features,
  available,
  status,
  statusLoading,
  onConnect,
  onDisconnect,
}: CrmCardProps) {
  const Icon = CRM_ICONS[id];
  const colors = CRM_ICON_COLORS[id];
  const connected = status?.connected ?? false;

  return (
    <div
      className={`
        group relative flex flex-col rounded-xl p-5 ag-float-card ag-glass
        ${available ? '' : 'opacity-60 grayscale-[0.3]'}
      `}
    >
      {/* Header: Icon + Name */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${colors.bg}`}
        >
          <Icon className={`h-5 w-5 ${colors.fg}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#0f172a]">{name}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
            {description}
          </p>
        </div>
      </div>

      {/* Feature Tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {features.map((feature) => (
          <Badge
            key={feature}
            variant="secondary"
            className="px-2 py-0.5 text-[10px] font-medium"
          >
            {feature}
          </Badge>
        ))}
      </div>

      {/* Connection Status & Actions */}
      <div className="mt-auto pt-4">
        {!available ? (
          /* Coming Soon */
          <div className="flex items-center justify-center">
            <Badge
              variant="outline"
              className="border-gray-200 text-[11px] text-gray-400"
            >
              Coming Soon
            </Badge>
          </div>
        ) : statusLoading ? (
          /* Loading */
          <div className="flex items-center justify-center py-1">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : connected ? (
          /* Connected */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" style={{ boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)' }} />
                </span>
                <span className="text-xs font-medium text-green-700">
                  Connected
                </span>
                {status?.accountName && (
                  <span className="text-xs text-gray-400">
                    {status.accountName}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => onDisconnect(id)}
              >
                <Unplug className="h-3 w-3" />
                Disconnect
              </Button>
            </div>

            {/* Field Mappings for connected CRMs */}
            <FieldMappingEditor provider={id} />
          </div>
        ) : (
          /* Disconnected — Connect button */
          <Button
            className="w-full bg-amber-500 text-white hover:bg-amber-600 transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:-translate-y-px"
            size="sm"
            onClick={() => onConnect(id)}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Integrations Page                                             */
/* ------------------------------------------------------------------ */

export function IntegrationsPage() {
  const { statuses, loading, refresh } = useCrmStatuses();
  const [stDialogOpen, setStDialogOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState<CrmProvider | null>(null);

  function handleConnect(provider: CrmProvider) {
    if (provider === 'hubspot') {
      window.location.href = '/api/integrations/hubspot/authorize';
    } else if (provider === 'servicetitan') {
      setStDialogOpen(true);
    }
  }

  async function handleDisconnect(provider: CrmProvider) {
    setDisconnecting(provider);
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, {
        method: 'POST',
      });
      refresh();
    } catch {
      // Silently handle — status poll will update
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-[#0f172a]">CRM Integrations</h2>
        <p className="mt-1 text-sm text-gray-500">
          Connect your business tools to automatically push call data, create
          contacts, and book appointments.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200/60 bg-amber-50/60 backdrop-blur-sm px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs leading-relaxed text-amber-800">
          When your AI receptionist handles a call, data flows automatically to
          your connected CRM.
        </p>
      </div>

      {/* CRM Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ag-stagger-children">
        {CRM_PROVIDERS.map((provider) => (
          <CrmCard
            key={provider.id}
            id={provider.id}
            name={provider.name}
            description={provider.description}
            features={provider.features}
            available={provider.available}
            status={statuses[provider.id]}
            statusLoading={loading || disconnecting === provider.id}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      {/* ServiceTitan Credentials Dialog */}
      <CrmConnectDialog
        open={stDialogOpen}
        onOpenChange={setStDialogOpen}
        onConnected={refresh}
      />
    </div>
  );
}
