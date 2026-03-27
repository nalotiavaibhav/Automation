import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { tokenStore } from '@/lib/crm/token-store';
import type { CrmOAuthTokens } from '@/types/crm';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || '';
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || '';

const HUBSPOT_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.objects.calls.read',
  'crm.objects.calls.write',
  'crm.objects.meetings.read',
  'crm.objects.meetings.write',
];

/**
 * GET /api/integrations/hubspot/callback
 *
 * HubSpot redirects here after the user authorizes the app.
 * Validates the state parameter, exchanges the authorization code for
 * tokens, stores them via tokenStore, and redirects to /settings.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user denial or HubSpot errors
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

    // Validate the state parameter against the stored cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('hubspot_oauth_state')?.value;

    if (!storedState || storedState !== state) {
      return Response.json(
        { error: 'Invalid state parameter — possible CSRF attack' },
        { status: 403 },
      );
    }

    // Clear the state cookie now that it has been validated
    cookieStore.delete('hubspot_oauth_state');

    // Exchange the authorization code for access and refresh tokens
    const redirectUri = `${request.nextUrl.origin}/api/integrations/hubspot/callback`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => '');
      console.error('[HubSpot Callback] Token exchange failed:', errorText);
      const redirectUrl = new URL('/settings', request.nextUrl.origin);
      redirectUrl.searchParams.set(
        'error',
        `HubSpot authentication failed (${tokenResponse.status})`,
      );
      return Response.redirect(redirectUrl.toString());
    }

    const data = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Build and persist the tokens
    const tokens: CrmOAuthTokens = {
      provider: 'hubspot',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1_000,
      scopes: HUBSPOT_SCOPES,
    };

    await tokenStore.saveTokens('default', tokens);

    // Redirect to settings with a success indicator
    const successUrl = new URL('/settings', request.nextUrl.origin);
    successUrl.searchParams.set('connected', 'hubspot');
    return Response.redirect(successUrl.toString());
  } catch (err) {
    console.error('[HubSpot Callback] Unexpected error:', err);
    const redirectUrl = new URL('/settings', request.nextUrl.origin);
    redirectUrl.searchParams.set(
      'error',
      err instanceof Error ? err.message : 'OAuth callback failed',
    );
    return Response.redirect(redirectUrl.toString());
  }
}
