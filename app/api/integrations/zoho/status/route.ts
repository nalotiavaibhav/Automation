import { NextResponse } from 'next/server';
import { tokenStore } from '@/lib/crm/token-store';

export async function GET() {
  try {
    const tokens = await tokenStore.getTokens('default', 'zoho');

    if (!tokens) {
      return NextResponse.json({ connected: false });
    }

    const baseUrl = tokens.tenantId || 'https://www.zohoapis.com';

    try {
      const res = await fetch(`${baseUrl}/crm/v6/Contacts?per_page=1`, {
        headers: { Authorization: `Zoho-oauthtoken ${tokens.accessToken}` },
      });
      if (!res.ok) throw new Error('API check failed');
    } catch {
      return NextResponse.json({
        connected: false,
        error: 'Token is invalid or expired',
      });
    }

    let accountName = 'Zoho CRM';
    try {
      const orgRes = await fetch(`${baseUrl}/crm/v6/org`, {
        headers: { Authorization: `Zoho-oauthtoken ${tokens.accessToken}` },
      });
      if (orgRes.ok) {
        const orgData = (await orgRes.json()) as { org?: Array<{ company_name?: string }> };
        if (orgData.org?.[0]?.company_name) {
          accountName = orgData.org[0].company_name;
        }
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
    console.error('[Zoho Status] Error:', error);
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    });
  }
}
