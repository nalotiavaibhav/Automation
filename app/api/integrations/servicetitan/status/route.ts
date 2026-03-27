import { NextResponse } from 'next/server';
import { tokenStore } from '@/lib/crm/token-store';

/**
 * GET /api/integrations/servicetitan/status
 *
 * Check whether a ServiceTitan connection is active.
 * Attempts a lightweight API call to verify the token is valid.
 */
export async function GET() {
  try {
    const tokens = await tokenStore.getTokens('default', 'servicetitan');

    if (!tokens) {
      return NextResponse.json({
        provider: 'servicetitan',
        connected: false,
        error: 'No credentials stored',
      });
    }

    // Determine base URL from environment
    const isSandbox = process.env.SERVICETITAN_ENV === 'sandbox';
    const baseUrl = isSandbox
      ? 'https://api-integration.servicetitan.io'
      : 'https://api.servicetitan.io';

    const tenantId =
      tokens.tenantId || process.env.SERVICETITAN_TENANT_ID || '';
    const appKey = tokens.appKey || process.env.SERVICETITAN_APP_KEY || '';

    if (!tenantId || !appKey) {
      return NextResponse.json({
        provider: 'servicetitan',
        connected: false,
        error: 'Missing tenantId or appKey in stored tokens',
      });
    }

    // Test the connection with a minimal API call
    const testUrl = `${baseUrl}/crm/v2/tenant/${tenantId}/customers?page=1&pageSize=1`;
    const testResponse = await fetch(testUrl, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'ST-App-Key': appKey,
        'Content-Type': 'application/json',
      },
    });

    if (testResponse.ok) {
      return NextResponse.json({
        provider: 'servicetitan',
        connected: true,
        accountName: `ServiceTitan (Tenant ${tenantId})`,
      });
    }

    return NextResponse.json({
      provider: 'servicetitan',
      connected: false,
      error: `API test failed with status ${testResponse.status}`,
    });
  } catch (error) {
    console.error('ServiceTitan status check error:', error);
    return NextResponse.json({
      provider: 'servicetitan',
      connected: false,
      error:
        error instanceof Error ? error.message : 'Status check failed',
    });
  }
}
