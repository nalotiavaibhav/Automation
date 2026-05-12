import { NextResponse } from 'next/server';
import { tokenStore } from '@/lib/crm/token-store';

export async function POST() {
  try {
    await tokenStore.deleteTokens('default', 'zoho');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Zoho Disconnect] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Failed to disconnect Zoho CRM',
      },
      { status: 500 },
    );
  }
}
