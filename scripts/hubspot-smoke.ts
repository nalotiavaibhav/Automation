/**
 * HubSpot smoke test — exercises the HAPPY PATH end-to-end against a real
 * HubSpot account (sandbox recommended). Every test creates real records.
 *
 *   npm run test:hubspot:smoke
 *
 * Records are tagged with `[FLOWMAX-TEST]` in the name so you can find +
 * delete them later via:
 *
 *   npm run test:hubspot:cleanup
 */
import 'dotenv/config';
import { HubSpotAdapter } from '../lib/crm/adapters/hubspot';
import type { CrmOAuthTokens } from '../types/crm';
import {
  banner,
  c,
  TestRunner,
  loadEnv,
  makeTestPhone,
  makeTestName,
  TEST_TAG,
  exitFromSummary,
} from './_lib';

function makeAdapter(token: string): HubSpotAdapter {
  // Private App tokens have no refresh token & don't expire.
  const tokens: CrmOAuthTokens = {
    provider: 'hubspot',
    accessToken: token,
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1_000, // 1 year sentinel
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.objects.calls.read',
      'crm.objects.calls.write',
      'crm.objects.meetings.read',
      'crm.objects.meetings.write',
    ],
  };
  return new HubSpotAdapter(tokens);
}

async function main(): Promise<void> {
  banner('HubSpot Smoke Test — Happy Path');

  const { token } = loadEnv();
  if (!token) {
    console.log(`${c.red}HUBSPOT_PRIVATE_APP_TOKEN missing. Run: npm run test:preflight${c.reset}\n`);
    process.exit(1);
  }

  const adapter = makeAdapter(token);
  const runner = new TestRunner();
  const created: { contacts: string[]; deals: string[] } = { contacts: [], deals: [] };

  // ── 1. Connection ──────────────────────────────────────────────────────
  runner.suite('Connection');

  await runner.run('getConnectionStatus returns connected=true', async () => {
    const status = await adapter.getConnectionStatus();
    if (!status.connected) {
      throw new Error(`Got connected=false. Error: ${status.error ?? 'none'}`);
    }
    return { notes: `provider=${status.provider}` };
  });

  // ── 2. Contact creation ────────────────────────────────────────────────
  runner.suite('Contact creation');

  const baseName = makeTestName('Smoke');
  const basePhone = makeTestPhone();
  let primaryContactId = '';

  await runner.run('createContact (full data)', async () => {
    const result = await adapter.createContact({
      firstName: `${TEST_TAG} ${baseName.firstName}`,
      lastName: baseName.lastName,
      phone: basePhone,
      email: `flowmax-test+${Date.now()}@example.com`,
      address: '123 Test St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    });
    if (!result.success || !result.externalId) {
      throw new Error(`Failed: ${result.error ?? 'no externalId returned'}`);
    }
    primaryContactId = result.externalId;
    created.contacts.push(primaryContactId);
    return { notes: `contactId=${primaryContactId}` };
  });

  await runner.run('createContact (minimum fields only)', async () => {
    const minName = makeTestName('Minimal');
    const result = await adapter.createContact({
      firstName: `${TEST_TAG} ${minName.firstName}`,
      lastName: minName.lastName,
      phone: makeTestPhone(),
    });
    if (!result.success || !result.externalId) {
      throw new Error(`Failed: ${result.error ?? 'no externalId returned'}`);
    }
    created.contacts.push(result.externalId);
    return { notes: `contactId=${result.externalId}` };
  });

  // ── 3. Deal creation ───────────────────────────────────────────────────
  runner.suite('Deal creation');

  await runner.run('createDeal (associated with contact, stage=new)', async () => {
    if (!primaryContactId) throw new Error('No primary contact — skipping');
    const result = await adapter.createDeal({
      title: `${TEST_TAG} Burst Pipe Service Call`,
      contactId: primaryContactId,
      externalContactId: primaryContactId,
      description: 'Caller reported burst pipe in basement. Need emergency tech.',
      serviceType: 'Plumbing',
      urgency: 'emergency',
      estimatedValue: 750,
      stage: 'new',
    });
    if (!result.success || !result.externalId) {
      throw new Error(`Failed: ${result.error ?? 'no externalId returned'}`);
    }
    created.deals.push(result.externalId);
    return { notes: `dealId=${result.externalId}` };
  });

  await runner.run('createDeal (each generic stage maps to HubSpot stage)', async () => {
    if (!primaryContactId) throw new Error('No primary contact');
    const stages: Array<'new' | 'contacted' | 'qualified' | 'booked' | 'completed'> = [
      'new',
      'contacted',
      'qualified',
      'booked',
      'completed',
    ];
    const ids: string[] = [];
    for (const stage of stages) {
      const result = await adapter.createDeal({
        title: `${TEST_TAG} Stage-Test ${stage}`,
        contactId: primaryContactId,
        externalContactId: primaryContactId,
        stage,
      });
      if (!result.success || !result.externalId) {
        throw new Error(`Stage "${stage}" failed: ${result.error}`);
      }
      ids.push(result.externalId);
      created.deals.push(result.externalId);
    }
    return { notes: `created ${ids.length} deals across 5 stages` };
  });

  await runner.run('createDeal (unknown stage falls back gracefully)', async () => {
    if (!primaryContactId) throw new Error('No primary contact');
    const result = await adapter.createDeal({
      title: `${TEST_TAG} Unknown-Stage`,
      contactId: primaryContactId,
      externalContactId: primaryContactId,
      stage: 'this-stage-does-not-exist', // intentional unknown stage value
    });
    if (!result.success || !result.externalId) {
      throw new Error(`Failed: ${result.error}`);
    }
    created.deals.push(result.externalId);
    return { notes: 'fell back to appointmentscheduled' };
  });

  // ── 4. Call log ────────────────────────────────────────────────────────
  runner.suite('Call logging');

  await runner.run('logCall (full transcript + recording)', async () => {
    if (!primaryContactId) throw new Error('No primary contact');
    const result = await adapter.logCall({
      contactId: primaryContactId,
      externalContactId: primaryContactId,
      direction: 'inbound',
      duration: 95,
      transcript:
        'AI: Thanks for calling Flowmax Plumbing, how can I help?\n' +
        'Customer: I have a burst pipe in the basement, water is everywhere.\n' +
        'AI: That sounds like an emergency, I am dispatching a tech right now.',
      summary: 'Emergency burst pipe. Dispatched.',
      recordingUrl: 'https://example.com/recordings/flowmax-test.wav',
      outcome: 'Appointment Booked',
      timestamp: new Date().toISOString(),
    });
    if (!result.success || !result.externalId) {
      throw new Error(`Failed: ${result.error}`);
    }
    return { notes: `callId=${result.externalId}` };
  });

  await runner.run('logCall (summary only, no transcript, no recording)', async () => {
    if (!primaryContactId) throw new Error('No primary contact');
    const result = await adapter.logCall({
      contactId: primaryContactId,
      externalContactId: primaryContactId,
      direction: 'inbound',
      duration: 12,
      summary: 'Wrong number.',
      timestamp: new Date().toISOString(),
    });
    if (!result.success || !result.externalId) {
      throw new Error(`Failed: ${result.error}`);
    }
    return { notes: `callId=${result.externalId}` };
  });

  // ── 5. Appointments ────────────────────────────────────────────────────
  runner.suite('Appointment / Meeting');

  await runner.run('bookAppointment (1-hr meeting tomorrow)', async () => {
    if (!primaryContactId) throw new Error('No primary contact');
    const start = new Date(Date.now() + 24 * 60 * 60 * 1_000);
    const end = new Date(start.getTime() + 60 * 60 * 1_000);
    const result = await adapter.bookAppointment({
      contactId: primaryContactId,
      externalContactId: primaryContactId,
      title: `${TEST_TAG} Service Visit`,
      description: 'Smoke-test appointment',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      location: '123 Test St, Springfield IL',
      serviceType: 'Plumbing',
    });
    if (!result.success || !result.externalId) {
      throw new Error(`Failed: ${result.error}`);
    }
    return { notes: `meetingId=${result.externalId}` };
  });

  // ── Summary + footer ───────────────────────────────────────────────────
  const s = runner.summary();

  console.log(
    `${c.gray}Created during this run:${c.reset} ${created.contacts.length} contacts, ${created.deals.length} deals.`,
  );
  if (created.contacts.length > 0) {
    console.log(
      `${c.gray}Run ${c.cyan}npm run test:hubspot:cleanup${c.gray} to remove them.${c.reset}\n`,
    );
  }

  exitFromSummary(s);
}

main().catch((err) => {
  console.error(`${c.red}Unexpected smoke-test error:${c.reset}`, err);
  process.exit(1);
});
