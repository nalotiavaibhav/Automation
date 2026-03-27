import { NextResponse } from 'next/server';
import type { CrmOAuthTokens } from '@/types/crm';
import { tokenStore } from '@/lib/crm/token-store';

/**
 * POST /api/integrations/servicetitan/connect
 *
 * Accepts ServiceTitan credentials and exchanges them for an access token
 * using the OAuth2 client credentials flow.
 *
 * Body: { clientId, clientSecret, appKey, tenantId }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      clientId?: string;
      clientSecret?: string;
      appKey?: string;
      tenantId?: string;
    };

    const clientId = body.clientId || process.env.SERVICETITAN_CLIENT_ID || '';
    const clientSecret =
      body.clientSecret || process.env.SERVICETITAN_CLIENT_SECRET || '';
    const appKey = body.appKey || process.env.SERVICETITAN_APP_KEY || '';
    const tenantId = body.tenantId || process.env.SERVICETITAN_TENANT_ID || '';

    if (!clientId || !clientSecret || !appKey || !tenantId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required credentials. Provide clientId, clientSecret, appKey, and tenantId.',
        },
        { status: 400 },
      );
    }

    // Determine auth URL based on environment
    const isSandbox = process.env.SERVICETITAN_ENV === 'sandbox';
    const authUrl = isSandbox
      ? 'https://auth-integration.servicetitan.io/connect/token'
      : 'https://auth.servicetitan.io/connect/token';

    // Exchange client credentials for an access token
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => '');
      return NextResponse.json(
        {
          success: false,
          error: `Authentication failed (${tokenResponse.status}): ${errorText}`,
        },
        { status: 401 },
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      expires_in: number;
    };

    // Build and store the tokens
    const tokens: CrmOAuthTokens = {
      provider: 'servicetitan',
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + tokenData.expires_in * 1_000,
      tenantId,
      appKey,
    };

    await tokenStore.saveTokens('default', tokens);

    return NextResponse.json({
      success: true,
      accountName: `ServiceTitan (Tenant ${tenantId})`,
    });
  } catch (error) {
    console.error('ServiceTitan connect error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to connect to ServiceTitan',
      },
      { status: 500 },
    );
  }
}
