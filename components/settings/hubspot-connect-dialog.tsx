'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HubSpotConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function HubSpotConnectDialog({
  open,
  onOpenChange,
  onConnected,
}: HubSpotConnectDialogProps) {
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [error, setError] = useState('');
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string }> | null>(null);

  async function handleConnect() {
    if (!token.trim()) return;
    setConnecting(true);
    setError('');

    try {
      const res = await fetch('/api/integrations/hubspot/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setConnected(true);
        setAccountName(data.accountName || 'HubSpot');
        onConnected();
      } else {
        setError(data.error || 'Connection failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setConnecting(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResults(null);

    try {
      const res = await fetch('/api/integrations/hubspot/test?cleanup=true', {
        method: 'POST',
      });
      const data = await res.json();
      setTestResults(data.results || {});
    } catch {
      setTestResults({ error: { ok: false, error: 'Network error' } });
    } finally {
      setTesting(false);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setToken('');
      setConnected(false);
      setAccountName('');
      setError('');
      setTestResults(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect HubSpot</DialogTitle>
          <DialogDescription>
            Enter your HubSpot Private App access token to connect. Create one in
            HubSpot Settings &rarr; Integrations &rarr; Private Apps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!connected ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Private App Token</label>
                <Input
                  type="password"
                  placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={connecting}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <XCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <Button
                className="w-full"
                onClick={handleConnect}
                disabled={!token.trim() || connecting}
              >
                {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Connected to {accountName}</p>
                  <p className="text-xs text-green-600 mt-0.5">Token verified successfully</p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
                {testing ? 'Running Test...' : 'Run Integration Test'}
              </Button>

              {testResults && (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Test Results</p>
                  {Object.entries(testResults).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{key}</span>
                      {val.ok ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" /> Pass
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-xs">
                          <XCircle className="h-3.5 w-3.5" /> {val.error || 'Fail'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
