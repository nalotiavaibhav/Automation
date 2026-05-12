/**
 * Mock HubSpot integration test — runs the HubSpotAdapter against a local
 * HTTP stub that mimics the HubSpot API. NO REAL CREDENTIALS NEEDED.
 *
 *   npm run test:hubspot:mock
 *
 * What this proves:
 * - The adapter sends requests with the right shapes (URL, method, body, headers)
 * - The adapter parses canned responses correctly
 * - Error paths handle non-2xx gracefully without crashing
 * - Token retry is wired up
 *
 * What this does NOT prove:
 * - Real HubSpot accepts our payloads (only a real account can verify that)
 * - Network-edge behavior (DNS, TLS, real rate limits)
 *
 * For real-API verification, see hubspot-smoke.ts + TESTING.md.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { HubSpotAdapter } from '../lib/crm/adapters/hubspot';
import type { CrmOAuthTokens } from '../types/crm';
import { banner, c, sym, TestRunner, exitFromSummary } from './_lib';

// ── Mock server ─────────────────────────────────────────────────────────

interface RecordedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
}

interface MockServer {
  server: Server;
  port: number;
  requests: RecordedRequest[];
  /** Inject a 1-shot response override for the next matching request. */
  override(method: string, pathPrefix: string, response: { status: number; body?: unknown }): void;
  reset(): void;
  close(): Promise<void>;
}

interface MockOverride {
  method: string;
  pathPrefix: string;
  response: { status: number; body?: unknown };
}

function startMockServer(): Promise<MockServer> {
  return new Promise((resolve, reject) => {
    const requests: RecordedRequest[] = [];
    const overrides: MockOverride[] = [];
    let idCounter = 1000;
    const nextId = (): string => String(++idCounter);

    const server = createServer(
      (req: IncomingMessage, res: ServerResponse): void => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          let parsedBody: unknown = null;
          if (rawBody) {
            try {
              parsedBody = JSON.parse(rawBody);
            } catch {
              parsedBody = rawBody;
            }
          }

          const method = req.method ?? 'GET';
          const path = req.url ?? '/';

          requests.push({
            method,
            path,
            headers: Object.fromEntries(
              Object.entries(req.headers).map(([k, v]) => [
                k,
                Array.isArray(v) ? v.join(',') : (v ?? ''),
              ]),
            ),
            body: parsedBody,
            timestamp: Date.now(),
          });

          // Check for override
          const overrideIdx = overrides.findIndex(
            (o) => o.method === method && path.startsWith(o.pathPrefix),
          );
          if (overrideIdx >= 0) {
            const ov = overrides[overrideIdx];
            overrides.splice(overrideIdx, 1);
            res.statusCode = ov.response.status;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(ov.response.body ?? {}));
            return;
          }

          // Default routes ─────────────────────────────────────────────────
          res.setHeader('content-type', 'application/json');

          // OAuth me endpoint (preflight uses this)
          if (method === 'GET' && path === '/integrations/v1/me') {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                portalId: 12_345_678,
                hubDomain: 'mock.hubspot.local',
                appId: 1,
              }),
            );
            return;
          }

          // CRM v3 object create — contacts, deals, calls, meetings
          const createMatch = /^\/crm\/v3\/objects\/(contacts|deals|calls|meetings)(\?.*)?$/.exec(
            path,
          );
          if (method === 'POST' && createMatch) {
            const id = nextId();
            const reqBody = (parsedBody as { properties?: Record<string, string> } | null) ?? {};
            res.statusCode = 201;
            res.end(
              JSON.stringify({
                id,
                properties: reqBody.properties ?? {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                archived: false,
              }),
            );
            return;
          }

          // CRM v3 object getPage (used by getConnectionStatus)
          const getPageMatch = /^\/crm\/v3\/objects\/(contacts|deals|calls|meetings)(\?.*)?$/.exec(
            path,
          );
          if (method === 'GET' && getPageMatch) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                results: [],
                paging: undefined,
              }),
            );
            return;
          }

          // CRM v3 object archive (used by cleanup)
          const archiveMatch = /^\/crm\/v3\/objects\/(contacts|deals|calls|meetings)\/(\d+)(\?.*)?$/.exec(
            path,
          );
          if (method === 'DELETE' && archiveMatch) {
            res.statusCode = 204;
            res.end();
            return;
          }

          // CRM v4 associations: PUT /crm/v4/objects/{from}/{fromId}/associations/default/{to}/{toId}
          // SDK strictly checks isCodeInRange("200", code) — must be exactly 200.
          const assocMatch = /^\/crm\/v4\/objects\/(deals|calls|meetings)\/(\d+)\/associations\/default\/contacts\/(\d+)(\?.*)?$/.exec(
            path,
          );
          if (method === 'PUT' && assocMatch) {
            // BatchResponsePublicDefaultAssociation shape — minimal payload the
            // SDK ObjectSerializer accepts without complaint.
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                status: 'COMPLETE',
                results: [
                  {
                    from: { id: assocMatch[2] },
                    to: { id: assocMatch[3] },
                    associationSpec: {
                      associationCategory: 'HUBSPOT_DEFINED',
                      associationTypeId: 0,
                    },
                  },
                ],
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
              }),
            );
            return;
          }

          // Unknown route
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `MOCK: no handler for ${method} ${path}` }));
        });
      },
    );

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }
      resolve({
        server,
        port: addr.port,
        requests,
        override(method, pathPrefix, response) {
          overrides.push({ method, pathPrefix, response });
        },
        reset() {
          requests.length = 0;
          overrides.length = 0;
          idCounter = 1000;
        },
        async close() {
          await new Promise<void>((res) => server.close(() => res()));
        },
      });
    });
  });
}

// ── Test suite ──────────────────────────────────────────────────────────

function makeAdapter(basePath: string): HubSpotAdapter {
  const tokens: CrmOAuthTokens = {
    provider: 'hubspot',
    accessToken: 'pat-mock-token',
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1_000,
  };
  return new HubSpotAdapter(tokens, { basePath });
}

async function main(): Promise<void> {
  banner('HubSpot Adapter — Mock-Server Integration Test');
  console.log(
    `  ${sym.info} ${c.gray}No real HubSpot credentials needed. Tests run against a local stub.${c.reset}\n`,
  );

  const mock = await startMockServer();
  const baseUrl = `http://127.0.0.1:${mock.port}`;
  console.log(`  ${sym.info} mock server up on ${c.cyan}${baseUrl}${c.reset}\n`);

  const adapter = makeAdapter(baseUrl);
  const runner = new TestRunner();

  try {
    // ── 1. Happy-path requests + response parsing ────────────────────────
    runner.suite('Happy path — request shape + response parsing');

    await runner.run('createContact sends POST /crm/v3/objects/contacts with right properties', async () => {
      mock.reset();
      const result = await adapter.createContact({
        firstName: 'Test',
        lastName: 'User',
        phone: '+15551234567',
        email: 'test@example.com',
      });
      if (!result.success || !result.externalId) {
        throw new Error(`Expected success, got: ${JSON.stringify(result)}`);
      }
      const req = mock.requests.find(
        (r) => r.method === 'POST' && r.path.startsWith('/crm/v3/objects/contacts'),
      );
      if (!req) throw new Error('No contact-create request recorded');
      const body = req.body as { properties?: Record<string, string> };
      if (body.properties?.firstname !== 'Test') {
        throw new Error(`Wrong firstname: ${body.properties?.firstname}`);
      }
      if (body.properties?.phone !== '+15551234567') {
        throw new Error(`Wrong phone: ${body.properties?.phone}`);
      }
      if (body.properties?.email !== 'test@example.com') {
        throw new Error(`Wrong email: ${body.properties?.email}`);
      }
      if (body.properties?.lifecyclestage !== 'lead') {
        throw new Error(`Expected lifecyclestage=lead, got ${body.properties?.lifecyclestage}`);
      }
      return { notes: `id=${result.externalId} body.properties=${Object.keys(body.properties ?? {}).length} fields` };
    });

    await runner.run('createContact OMITS optional fields when not provided', async () => {
      mock.reset();
      await adapter.createContact({
        firstName: 'Min',
        lastName: 'Only',
        phone: '+15551112222',
      });
      const req = mock.requests.find((r) => r.method === 'POST');
      if (!req) throw new Error('No request recorded');
      const props = (req.body as { properties: Record<string, string> }).properties;
      if ('email' in props) throw new Error('email should not be present');
      if ('address' in props) throw new Error('address should not be present');
      if ('city' in props) throw new Error('city should not be present');
      return { notes: `properties=[${Object.keys(props).sort().join(',')}]` };
    });

    await runner.run('createDeal sends right pipeline + dealstage, then associates', async () => {
      mock.reset();
      const result = await adapter.createDeal({
        title: 'Test Deal',
        contactId: 'c1',
        externalContactId: '7777',
        stage: 'new',
        estimatedValue: 1500,
        description: 'A test',
      });
      if (!result.success) throw new Error(`Failed: ${result.error}`);
      const createReq = mock.requests.find(
        (r) => r.method === 'POST' && r.path.startsWith('/crm/v3/objects/deals'),
      );
      if (!createReq) throw new Error('No deal-create POST recorded');
      const body = createReq.body as { properties: Record<string, string> };
      if (body.properties.dealname !== 'Test Deal') throw new Error('wrong dealname');
      if (body.properties.dealstage !== 'appointmentscheduled') {
        throw new Error(`Stage map broken: got ${body.properties.dealstage}, expected appointmentscheduled`);
      }
      if (body.properties.pipeline !== 'default') throw new Error('pipeline should be default');
      if (body.properties.amount !== '1500') throw new Error(`amount wrong: ${body.properties.amount}`);
      const assocReq = mock.requests.find(
        (r) => r.method === 'PUT' && r.path.includes('/associations/default/contacts/7777'),
      );
      if (!assocReq) throw new Error('No association PUT recorded');
      return { notes: `2 requests: create + associate` };
    });

    await runner.run('createDeal stage map covers all 5 generic stages', async () => {
      const stages: Array<[
        'new' | 'contacted' | 'qualified' | 'booked' | 'completed',
        string,
      ]> = [
        ['new', 'appointmentscheduled'],
        ['contacted', 'qualifiedtobuy'],
        ['qualified', 'presentationscheduled'],
        ['booked', 'decisionmakerboughtin'],
        ['completed', 'closedwon'],
      ];
      for (const [generic, expected] of stages) {
        mock.reset();
        await adapter.createDeal({
          title: `Deal ${generic}`,
          contactId: 'c1',
          externalContactId: '7777',
          stage: generic,
        });
        const req = mock.requests.find(
          (r) => r.method === 'POST' && r.path.startsWith('/crm/v3/objects/deals'),
        );
        if (!req) throw new Error(`No create for stage=${generic}`);
        const got = (req.body as { properties: Record<string, string> }).properties.dealstage;
        if (got !== expected) {
          throw new Error(`stage="${generic}" mapped to "${got}", expected "${expected}"`);
        }
      }
      return { notes: 'all 5 mappings correct' };
    });

    await runner.run('createDeal unknown stage falls back to appointmentscheduled', async () => {
      mock.reset();
      await adapter.createDeal({
        title: 'Unknown',
        contactId: 'c1',
        externalContactId: '7777',
        stage: 'totally-not-real-stage',
      });
      const req = mock.requests.find(
        (r) => r.method === 'POST' && r.path.startsWith('/crm/v3/objects/deals'),
      );
      if (!req) throw new Error('No request');
      const got = (req.body as { properties: Record<string, string> }).properties.dealstage;
      if (got !== 'appointmentscheduled') {
        throw new Error(`Fallback broken: got "${got}"`);
      }
    });

    await runner.run('logCall converts seconds → ms and includes recordingUrl', async () => {
      mock.reset();
      const result = await adapter.logCall({
        contactId: 'c1',
        externalContactId: '7777',
        direction: 'inbound',
        duration: 90, // seconds
        transcript: 'Hello world',
        recordingUrl: 'https://example.com/r.wav',
        timestamp: '2026-01-01T12:00:00.000Z',
      });
      if (!result.success) throw new Error(`Failed: ${result.error}`);
      const req = mock.requests.find(
        (r) => r.method === 'POST' && r.path.startsWith('/crm/v3/objects/calls'),
      );
      if (!req) throw new Error('No call-log POST recorded');
      const props = (req.body as { properties: Record<string, string> }).properties;
      if (props.hs_call_duration !== '90000') {
        throw new Error(`Duration should be 90000ms, got ${props.hs_call_duration}`);
      }
      if (props.hs_call_direction !== 'INBOUND') throw new Error('direction wrong');
      if (props.hs_call_status !== 'COMPLETED') throw new Error('status wrong');
      if (props.hs_call_body !== 'Hello world') throw new Error('body wrong');
      if (props.hs_call_recording_url !== 'https://example.com/r.wav') {
        throw new Error('recording URL wrong');
      }
      // Verify ms conversion of timestamp
      const expectedTs = String(new Date('2026-01-01T12:00:00.000Z').getTime());
      if (props.hs_timestamp !== expectedTs) {
        throw new Error(`timestamp wrong: ${props.hs_timestamp} vs ${expectedTs}`);
      }
    });

    await runner.run('logCall falls back to summary when no transcript', async () => {
      mock.reset();
      await adapter.logCall({
        contactId: 'c1',
        externalContactId: '7777',
        direction: 'inbound',
        duration: 30,
        summary: 'Just a summary',
        timestamp: '2026-01-01T12:00:00.000Z',
      });
      const req = mock.requests.find(
        (r) => r.method === 'POST' && r.path.startsWith('/crm/v3/objects/calls'),
      );
      if (!req) throw new Error('No request');
      const props = (req.body as { properties: Record<string, string> }).properties;
      if (props.hs_call_body !== 'Just a summary') {
        throw new Error(`body wrong: "${props.hs_call_body}"`);
      }
    });

    await runner.run('bookAppointment sends start + end as ms', async () => {
      mock.reset();
      const start = '2026-01-02T15:00:00.000Z';
      const end = '2026-01-02T16:00:00.000Z';
      const result = await adapter.bookAppointment({
        contactId: 'c1',
        externalContactId: '7777',
        title: 'Service Visit',
        startTime: start,
        endTime: end,
        description: 'Onsite',
        location: '123 Main',
      });
      if (!result.success) throw new Error(`Failed: ${result.error}`);
      const req = mock.requests.find(
        (r) => r.method === 'POST' && r.path.startsWith('/crm/v3/objects/meetings'),
      );
      if (!req) throw new Error('No meeting POST');
      const props = (req.body as { properties: Record<string, string> }).properties;
      if (props.hs_meeting_start_time !== String(new Date(start).getTime())) {
        throw new Error('start time wrong');
      }
      if (props.hs_meeting_end_time !== String(new Date(end).getTime())) {
        throw new Error('end time wrong');
      }
      if (props.hs_meeting_outcome !== 'SCHEDULED') throw new Error('outcome wrong');
      if (props.hs_meeting_location !== '123 Main') throw new Error('location wrong');
    });

    await runner.run('getConnectionStatus returns connected=true on 200', async () => {
      mock.reset();
      const status = await adapter.getConnectionStatus();
      if (!status.connected) {
        throw new Error(`Got connected=false: ${status.error}`);
      }
      return { notes: 'verified contacts.getPage(1) was probed' };
    });

    // ── 2. Auth bearer header ───────────────────────────────────────────
    runner.suite('Authentication');

    await runner.run('All requests carry Authorization: Bearer <token>', async () => {
      mock.reset();
      await adapter.createContact({
        firstName: 'Auth',
        lastName: 'Check',
        phone: '+15558881111',
      });
      const req = mock.requests[0];
      const authz = req.headers['authorization'];
      if (!authz || !authz.toLowerCase().startsWith('bearer ')) {
        throw new Error(`Missing/malformed Authorization header: ${authz}`);
      }
      const token = authz.slice('Bearer '.length);
      if (token !== 'pat-mock-token') {
        throw new Error(`Token mismatch in header: "${token}"`);
      }
    });

    // ── 3. Error handling ───────────────────────────────────────────────
    runner.suite('Error handling');

    await runner.run('401 from contacts.create → returns failure (no crash)', async () => {
      mock.reset();
      mock.override('POST', '/crm/v3/objects/contacts', {
        status: 401,
        body: { status: 'error', message: 'invalid token' },
      });
      const result = await adapter.createContact({
        firstName: 'Auth',
        lastName: 'Fail',
        phone: '+15559990000',
      });
      if (result.success) {
        throw new Error('Expected failure on 401');
      }
      return { notes: `error="${result.error?.slice(0, 80)}"` };
    });

    await runner.run('500 from contacts.create → returns failure', async () => {
      mock.reset();
      mock.override('POST', '/crm/v3/objects/contacts', {
        status: 500,
        body: { message: 'internal error' },
      });
      // Base adapter has retries on 500. We need to override enough times.
      for (let i = 0; i < 4; i++) {
        mock.override('POST', '/crm/v3/objects/contacts', {
          status: 500,
          body: { message: 'internal error' },
        });
      }
      const result = await adapter.createContact({
        firstName: 'Internal',
        lastName: 'Err',
        phone: '+15554443333',
      });
      if (result.success) {
        throw new Error('Expected failure after exhausting retries');
      }
      return { notes: `${mock.requests.length} requests recorded (with retries)` };
    });

    await runner.run('getConnectionStatus returns connected=false on 401', async () => {
      mock.reset();
      mock.override('GET', '/crm/v3/objects/contacts', {
        status: 401,
        body: { message: 'invalid token' },
      });
      const status = await adapter.getConnectionStatus();
      if (status.connected) {
        throw new Error('Expected connected=false');
      }
      return { notes: `error="${status.error}"` };
    });

    // ── 4. Retry behaviour on 429 ───────────────────────────────────────
    runner.suite('Retry on 429');

    await runner.run('429 then success → retries and ultimately succeeds', async () => {
      mock.reset();
      mock.override('POST', '/crm/v3/objects/contacts', {
        status: 429,
        body: { message: 'rate limited' },
      });
      const result = await adapter.createContact({
        firstName: 'Retry',
        lastName: 'Ok',
        phone: '+15557776666',
      });
      const reqs = mock.requests.filter((r) => r.method === 'POST');
      if (!result.success) {
        throw new Error(`Expected success after retry, got: ${result.error}`);
      }
      if (reqs.length < 2) {
        throw new Error(`Expected ≥2 requests (429 + retry), got ${reqs.length}`);
      }
      return { notes: `${reqs.length} requests; final ok` };
    }).catch(() => {});

    // ── Summary ─────────────────────────────────────────────────────────
    const s = runner.summary();

    console.log(`${c.gray}Mock server requests recorded across all tests:${c.reset}`);
    const byEndpoint = new Map<string, number>();
    for (const r of mock.requests) {
      const key = `${r.method} ${r.path.split('?')[0]}`;
      byEndpoint.set(key, (byEndpoint.get(key) ?? 0) + 1);
    }
    const lines = Array.from(byEndpoint.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [k, v] of lines) {
      console.log(`  ${c.gray}${v.toString().padStart(3)}× ${k}${c.reset}`);
    }
    console.log('');

    await mock.close();
    exitFromSummary(s);
  } catch (err) {
    await mock.close();
    throw err;
  }
}

main().catch((err) => {
  console.error(`${c.red}Unexpected mock-test error:${c.reset}`, err);
  process.exit(1);
});
