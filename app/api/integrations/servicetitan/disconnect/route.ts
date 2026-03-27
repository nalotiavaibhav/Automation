import { NextResponse } from 'next/server';
import { tokenStore } from '@/lib/crm/token-store';

/**
 * POST /api/integrations/servicetitan/disconnect
 *
 * Remove stored ServiceTitan credentials and tokens.
 */
export async function POST() {
  try {
    await tokenStore.deleteTokens('default', 'servicetitan');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ServiceTitan disconnect error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to disconnect ServiceTitan',
      },
      { status: 500 },
    );
  }
}
