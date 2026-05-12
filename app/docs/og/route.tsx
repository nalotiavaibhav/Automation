import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get('title') ?? 'Flowmax Docs';
  const description = url.searchParams.get('description') ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 38, fontWeight: 700, color: '#fff' }}>
          <span>Flow</span>
          <span style={{ color: '#f59e0b' }}>max</span>
          <span style={{ marginLeft: 16, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>docs</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 64, lineHeight: 1.1, color: '#fff', fontWeight: 700, letterSpacing: -1 }}>
            {title}
          </div>
          {description && (
            <div style={{ fontSize: 28, lineHeight: 1.4, color: 'rgba(255,255,255,0.75)', maxWidth: 880 }}>
              {description}
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
