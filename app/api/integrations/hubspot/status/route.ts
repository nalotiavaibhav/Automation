import { NextResponse } from 'next/server';
import { Client } from '@hubspot/api-client';
import { tokenStore } from '@/lib/crm/token-store';

/**
 * GET /api/integrations/hubspot/status
 *
 * Check whether a HubSpot connection is active.
 * Attempts a lightweight API call (list contacts, limit 1) to verify
 * that the stored access token is still valid.
 */
export async function GET() {
  try {
    const tokens = await tokenStore.getTokens('default', 'hubspot');

    if (!tokens) {
      return NextResponse.json({
        connected: false,
      });
    }

    // Try a minimal API call to verify the token
    const client = new Client({ accessToken: tokens.accessToken });

    try {
      await client.crm.contacts.basicApi.getPage(1);
    } catch {
      return NextResponse.json({
        connected: false,
        error: 'Token is invalid or expired',
      });
    }

    // Try to get real account name
    let accountName = tokens.refreshToken ? 'HubSpot (OAuth)' : 'HubSpot (Private App)';
    try {
      const infoRes = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${tokens.accessToken}`,
      );
      if (infoRes.ok) {
        const info = (await infoRes.json()) as { hub_domain?: string; hub_id?: number };
        if (info.hub_domain) accountName = info.hub_domain;
        else if (info.hub_id) accountName = `HubSpot (${info.hub_id})`;
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      connected: true,
      accountName,
      lastSyncAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[HubSpot Status] Error:', error);
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    });
  }
}
