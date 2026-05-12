import { NextResponse } from 'next/server';
import { Client } from '@hubspot/api-client';
import type { CrmOAuthTokens } from '@/types/crm';
import { tokenStore } from '@/lib/crm/token-store';

/**
 * POST /api/integrations/hubspot/connect
 *
 * Connects HubSpot using a Private App access token.
 * This is the fastest path to verify the integration without full OAuth setup.
 *
 * Body: { accessToken: string }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accessToken?: string };

    const accessToken =
      body.accessToken || process.env.HUBSPOT_PRIVATE_APP_TOKEN || '';

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Missing access token. Provide a HubSpot Private App token.' },
        { status: 400 },
      );
    }

    // Validate the token by making a lightweight API call
    const client = new Client({ accessToken });
    let accountName = 'HubSpot (Private App)';

    try {
      await client.crm.contacts.basicApi.getPage(1);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token — could not access HubSpot contacts.' },
        { status: 401 },
      );
    }

    // Try to fetch account info for display name
    try {
      const infoRes = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`,
      );
      if (infoRes.ok) {
        const info = (await infoRes.json()) as { hub_domain?: string; hub_id?: number };
        if (info.hub_domain) {
          accountName = info.hub_domain;
        } else if (info.hub_id) {
          accountName = `HubSpot (${info.hub_id})`;
        }
      }
    } catch {
      // Non-critical — keep default name
    }

    // Store the token with a far-future expiry (Private App tokens don't expire)
    const tokens: CrmOAuthTokens = {
      provider: 'hubspot',
      accessToken,
      expiresAt: Date.now() + 10 * 365 * 24 * 60 * 60 * 1_000, // 10 years
      scopes: [
        'crm.objects.contacts.read',
        'crm.objects.contacts.write',
        'crm.objects.deals.read',
        'crm.objects.deals.write',
        'crm.objects.calls.read',
        'crm.objects.calls.write',
      ],
    };

    await tokenStore.saveTokens('default', tokens);

    return NextResponse.json({ success: true, accountName });
  } catch (error) {
    console.error('[HubSpot Connect] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect',
      },
      { status: 500 },
    );
  }
}
