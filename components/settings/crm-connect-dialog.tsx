'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CrmConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

type TestState = 'idle' | 'testing' | 'success' | 'error';

export function CrmConnectDialog({
  open,
  onOpenChange,
  onConnected,
}: CrmConnectDialogProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [appKey, setAppKey] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const canTest = clientId && clientSecret && appKey && tenantId;
  const canSave = testState === 'success';

  async function handleTestConnection() {
    setTestState('testing');
    setErrorMessage('');

    try {
      const res = await fetch('/api/integrations/servicetitan/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientSecret,
          appKey,
          tenantId,
        }),
      });

      if (res.ok) {
        setTestState('success');
      } else {
        const data = await res.json().catch(() => null);
        setErrorMessage(
          data?.error || 'Connection test failed. Please verify your credentials.'
        );
        setTestState('error');
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.');
      setTestState('error');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/integrations/servicetitan/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientSecret,
          appKey,
          tenantId,
          save: true,
        }),
      });

      if (res.ok) {
        onConnected?.();
        onOpenChange(false);
        resetForm();
      } else {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.error || 'Failed to save credentials.');
        setTestState('error');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setTestState('error');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setClientId('');
    setClientSecret('');
    setAppKey('');
    setTenantId('');
    setTestState('idle');
    setErrorMessage('');
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md ag-glass-heavy rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
              <ShieldCheck className="h-4 w-4 text-orange-600" />
            </span>
            Connect ServiceTitan
          </DialogTitle>
          <DialogDescription>
            Enter your ServiceTitan API credentials. You can find these in your
            ServiceTitan developer portal under API Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="st-client-id">Client ID</Label>
            <Input
              id="st-client-id"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                if (testState !== 'idle') setTestState('idle');
              }}
              placeholder="Enter your Client ID"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="st-client-secret">Client Secret</Label>
            <Input
              id="st-client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => {
                setClientSecret(e.target.value);
                if (testState !== 'idle') setTestState('idle');
              }}
              placeholder="Enter your Client Secret"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="st-app-key">App Key</Label>
            <Input
              id="st-app-key"
              value={appKey}
              onChange={(e) => {
                setAppKey(e.target.value);
                if (testState !== 'idle') setTestState('idle');
              }}
              placeholder="Enter your App Key"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="st-tenant-id">Tenant ID</Label>
            <Input
              id="st-tenant-id"
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                if (testState !== 'idle') setTestState('idle');
              }}
              placeholder="Enter your Tenant ID"
              className="font-mono text-sm tabular-nums"
            />
          </div>

          {/* Status Messages */}
          {testState === 'success' && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 ag-enter">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Connected successfully. Credentials verified.</span>
            </div>
          )}

          {testState === 'error' && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 ag-enter">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!canTest || testState === 'testing'}
          >
            {testState === 'testing' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Testing...
              </>
            ) : testState === 'success' ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                Test Passed
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          <Button
            disabled={!canSave || saving}
            onClick={handleSave}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Connect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
