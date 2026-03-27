import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || '';

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
 * GET /api/integrations/hubspot/authorize
 *
 * Initiates the HubSpot OAuth2 authorization code flow.
 * Generates a random state parameter, stores it in a cookie for CSRF
 * protection, and redirects the user to HubSpot's consent screen.
 */
export async function GET(request: NextRequest) {
  if (!HUBSPOT_CLIENT_ID) {
    return Response.json(
      { error: 'HUBSPOT_CLIENT_ID is not configured' },
      { status: 500 },
    );
  }

  // Generate a cryptographically random state string for CSRF protection
  const state = crypto.randomBytes(24).toString('hex');

  // Store the state in a cookie so we can verify it on callback
  const cookieStore = await cookies();
  cookieStore.set('hubspot_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Build the redirect URI from the current request origin
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/integrations/hubspot/callback`;

  const params = new URLSearchParams({
    client_id: HUBSPOT_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: HUBSPOT_SCOPES.join(' '),
    state,
  });

  const authUrl = `https://app.hubspot.com/oauth/authorize?${params.toString()}`;

  return Response.redirect(authUrl);
}
