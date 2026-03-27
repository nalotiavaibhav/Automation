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

    return NextResponse.json({
      connected: true,
      accountName: 'HubSpot',
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
