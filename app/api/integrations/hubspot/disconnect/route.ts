import { NextResponse } from 'next/server';
import { tokenStore } from '@/lib/crm/token-store';

/**
 * POST /api/integrations/hubspot/disconnect
 *
 * Remove stored HubSpot OAuth tokens, effectively disconnecting the integration.
 */
export async function POST() {
  try {
    await tokenStore.deleteTokens('default', 'hubspot');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[HubSpot Disconnect] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Failed to disconnect HubSpot',
      },
      { status: 500 },
    );
  }
}
