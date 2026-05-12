import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';

const ZOHO_SCOPES = [
  'ZohoCRM.modules.contacts.ALL',
  'ZohoCRM.modules.deals.ALL',
  'ZohoCRM.modules.activities.ALL',
  'ZohoCRM.modules.events.ALL',
  'ZohoCRM.settings.ALL',
];

export async function GET(request: NextRequest) {
  if (!ZOHO_CLIENT_ID) {
    return Response.json(
      { error: 'ZOHO_CLIENT_ID is not configured' },
      { status: 500 },
    );
  }

  const state = crypto.randomBytes(24).toString('hex');

  const cookieStore = await cookies();
  cookieStore.set('zoho_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/integrations/zoho/callback`;

  const params = new URLSearchParams({
    client_id: ZOHO_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: ZOHO_SCOPES.join(','),
    response_type: 'code',
    access_type: 'offline',
    state,
  });

  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;

  return Response.redirect(authUrl);
}
