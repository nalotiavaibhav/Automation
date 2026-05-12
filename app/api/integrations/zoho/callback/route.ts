import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { tokenStore } from '@/lib/crm/token-store';
import type { CrmOAuthTokens } from '@/types/crm';

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';

const ZOHO_SCOPES = [
  'ZohoCRM.modules.contacts.ALL',
  'ZohoCRM.modules.deals.ALL',
  'ZohoCRM.modules.activities.ALL',
  'ZohoCRM.modules.events.ALL',
  'ZohoCRM.settings.ALL',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      const errorDescription = searchParams.get('error_description') || error;
      const redirectUrl = new URL('/settings', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', errorDescription);
      return Response.redirect(redirectUrl.toString());
    }

    if (!code || !state) {
      return Response.json(
        { error: 'Missing code or state parameter' },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get('zoho_oauth_state')?.value;

    if (!storedState || storedState !== state) {
      return Response.json(
        { error: 'Invalid state parameter — possible CSRF attack' },
        { status: 403 },
      );
    }

    cookieStore.delete('zoho_oauth_state');

    const redirectUri = `${request.nextUrl.origin}/api/integrations/zoho/callback`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => '');
      console.error('[Zoho Callback] Token exchange failed:', errorText);
      const redirectUrl = new URL('/settings', request.nextUrl.origin);
      redirectUrl.searchParams.set(
        'error',
        `Zoho authentication failed (${tokenResponse.status})`,
      );
      return Response.redirect(redirectUrl.toString());
    }

    const data = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      api_domain: string;
    };

    const tokens: CrmOAuthTokens = {
      provider: 'zoho',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1_000,
      scopes: ZOHO_SCOPES,
      tenantId: data.api_domain || 'https://www.zohoapis.com',
    };

    await tokenStore.saveTokens('default', tokens);

    const successUrl = new URL('/settings', request.nextUrl.origin);
    successUrl.searchParams.set('connected', 'zoho');
    return Response.redirect(successUrl.toString());
  } catch (err) {
    console.error('[Zoho Callback] Unexpected error:', err);
    const redirectUrl = new URL('/settings', request.nextUrl.origin);
    redirectUrl.searchParams.set(
      'error',
      err instanceof Error ? err.message : 'OAuth callback failed',
    );
    return Response.redirect(redirectUrl.toString());
  }
}
