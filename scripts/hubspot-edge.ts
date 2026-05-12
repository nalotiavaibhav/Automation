/**
 * HubSpot edge-case test — exercises the places the adapter is most likely
 * to break: bad input, weird input, network failures, auth failures, large
 * payloads, special characters, concurrency, idempotency.
 *
 *   npm run test:hubspot:edge
 *
 * Like the smoke test, this creates real records (tagged [FLOWMAX-TEST]).
 * Use `npm run test:hubspot:cleanup` to delete them after.
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
  const tokens: CrmOAuthTokens = {
    provider: 'hubspot',
    accessToken: token,
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1_000,
  };
  return new HubSpotAdapter(tokens);
}

const HUGE_TRANSCRIPT_TURNS = 200;
function makeHugeTranscript(): string {
  const lines: string[] = [];
  for (let i = 0; i < HUGE_TRANSCRIPT_TURNS; i++) {
    lines.push(
      `AI: This is response number ${i}. Lorem ipsum dolor sit amet, ` +
        'consectetur adipiscing elit, sed do eiusmod tempor incididunt ut ' +
        'labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud.',
    );
    lines.push(`Customer: Okay, and what about turn ${i}? Tell me more about that.`);
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  banner('HubSpot Edge-Case Test — Things That Tend To Break');

  const { token } = loadEnv();
  if (!token) {
    console.log(
      `${c.red}HUBSPOT_PRIVATE_APP_TOKEN missing. Run: npm run test:preflight${c.reset}\n`,
    );
    process.exit(1);
  }

  const adapter = makeAdapter(token);
  const runner = new TestRunner();
  const contactIds: string[] = [];

  // ── 1. Auth failures ───────────────────────────────────────────────────
  runner.suite('Authentication failures');

  await runner.run('Invalid token → getConnectionStatus returns connected=false', async () => {
    const badAdapter = makeAdapter('pat-na1-DEFINITELY-NOT-A-REAL-TOKEN');
    const status = await badAdapter.getConnectionStatus();
    if (status.connected) {
      throw new Error('Expected connected=false with garbage token, got connected=true');
    }
    return { notes: `error="${status.error}"` };
  });

  await runner.run('Invalid token → createContact returns failure (not crash)', async () => {
    const badAdapter = makeAdapter('pat-na1-DEFINITELY-NOT-A-REAL-TOKEN');
    const name = makeTestName('AuthFail');
    const result = await badAdapter.createContact({
      firstName: `${TEST_TAG} ${name.firstName}`,
      lastName: name.lastName,
      phone: makeTestPhone(),
    });
    if (result.success) {
      throw new Error('Expected failure with garbage token, got success');
    }
    return { notes: 'gracefully returned { success: false }' };
  });

  // ── 2. Input edge cases ────────────────────────────────────────────────
  runner.suite('Input edge cases');

  await runner.run('Phone in multiple formats produces separate contacts (NO dedupe)', async () => {
    const name1 = makeTestName('PhoneFormatA');
    const name2 = makeTestName('PhoneFormatB');
    // Same digits, different formatting
    const r1 = await adapter.createContact({
      firstName: `${TEST_TAG} ${name1.firstName}`,
      lastName: name1.lastName,
      phone: '+15550199123456',
    });
    const r2 = await adapter.createContact({
      firstName: `${TEST_TAG} ${name2.firstName}`,
      lastName: name2.lastName,
      phone: '(555) 019-9123456',
    });
    if (!r1.success || !r2.success) {
      throw new Error('Expected both to succeed');
    }
    if (r1.externalId === r2.externalId) {
      throw new Error('Expected separate IDs (HubSpot does not auto-dedupe by phone variant)');
    }
    if (r1.externalId) contactIds.push(r1.externalId);
    if (r2.externalId) contactIds.push(r2.externalId);
    return {
      notes: `two distinct contacts created (${r1.externalId}, ${r2.externalId}) — adapter should normalize`,
    };
  });

  await runner.run('Special characters in name (unicode, quotes, slashes)', async () => {
    const result = await adapter.createContact({
      firstName: `${TEST_TAG} O'Reilly-™`,
      lastName: `García "Ñoño" Müller/Smith`,
      phone: makeTestPhone(),
    });
    if (!result.success) throw new Error(`Failed: ${result.error}`);
    if (result.externalId) contactIds.push(result.externalId);
    return { notes: 'HubSpot accepted special chars' };
  });

  await runner.run('Empty optional fields are omitted (not sent as empty strings)', async () => {
    const name = makeTestName('EmptyOpt');
    const result = await adapter.createContact({
      firstName: `${TEST_TAG} ${name.firstName}`,
      lastName: name.lastName,
      phone: makeTestPhone(),
      // email/address/city intentionally not passed
    });
    if (!result.success) throw new Error(`Failed: ${result.error}`);
    if (result.externalId) contactIds.push(result.externalId);
  });

  await runner.run('Very long first name (200 chars)', async () => {
    const name = makeTestName('LongName');
    const longFirst = `${TEST_TAG} ` + 'A'.repeat(200);
    const result = await adapter.createContact({
      firstName: longFirst,
      lastName: name.lastName,
      phone: makeTestPhone(),
    });
    if (!result.success) {
      // HubSpot's max is ~256 chars per property; this should still pass.
      throw new Error(`Failed: ${result.error}`);
    }
    if (result.externalId) contactIds.push(result.externalId);
    return { notes: `${longFirst.length} chars accepted` };
  });

  // ── 3. Call log edge cases ─────────────────────────────────────────────
  runner.suite('Call log edge cases');

  await runner.run('Very large transcript (200 turns)', async () => {
    if (contactIds.length === 0) throw new Error('Need a contact first');
    const transcript = makeHugeTranscript();
    const result = await adapter.logCall({
      contactId: contactIds[0],
      externalContactId: contactIds[0],
      direction: 'inbound',
      duration: 600,
      transcript,
      timestamp: new Date().toISOString(),
    });
    if (!result.success) {
      throw new Error(`Failed: ${result.error}`);
    }
    return {
      notes: `transcript ${transcript.length} chars, ${HUGE_TRANSCRIPT_TURNS * 2} lines`,
    };
  });

  await runner.run('Zero-duration call', async () => {
    if (contactIds.length === 0) throw new Error('Need a contact first');
    const result = await adapter.logCall({
      contactId: contactIds[0],
      externalContactId: contactIds[0],
      direction: 'inbound',
      duration: 0,
      summary: 'Hang-up before greeting.',
      timestamp: new Date().toISOString(),
    });
    if (!result.success) throw new Error(`Failed: ${result.error}`);
  });

  await runner.run('Transcript with control characters (NUL, vertical tab)', async () => {
    if (contactIds.length === 0) throw new Error('Need a contact first');
    const result = await adapter.logCall({
      contactId: contactIds[0],
      externalContactId: contactIds[0],
      direction: 'inbound',
      duration: 30,
      transcript: 'AI: Hello\x00 there\x0Bcustomer.',
      timestamp: new Date().toISOString(),
    });
    if (!result.success) {
      // If HubSpot rejects, that's also useful information — the adapter
      // should probably sanitize. Mark as a known issue rather than failure.
      throw new Error(
        `Failed (this may be a HubSpot limitation worth handling in the adapter): ${result.error}`,
      );
    }
  });

  // ── 4. Deal stage mapping ──────────────────────────────────────────────
  runner.suite('Deal stage mapping');

  await runner.run('Each generic stage produces a non-empty externalId', async () => {
    if (contactIds.length === 0) throw new Error('Need a contact first');
    const stages = ['new', 'contacted', 'qualified', 'booked', 'completed'] as const;
    const ids: string[] = [];
    for (const s of stages) {
      const r = await adapter.createDeal({
        title: `${TEST_TAG} Stage=${s}`,
        contactId: contactIds[0],
        externalContactId: contactIds[0],
        stage: s,
      });
      if (!r.success || !r.externalId) {
        throw new Error(`Stage "${s}" failed: ${r.error}`);
      }
      ids.push(r.externalId);
    }
    return { notes: `${ids.length} stages OK` };
  });

  await runner.run('Pass-through HubSpot-native stage (appointmentscheduled)', async () => {
    if (contactIds.length === 0) throw new Error('Need a contact first');
    const r = await adapter.createDeal({
      title: `${TEST_TAG} Native-Stage`,
      contactId: contactIds[0],
      externalContactId: contactIds[0],
      stage: 'appointmentscheduled',
    });
    if (!r.success) throw new Error(`Failed: ${r.error}`);
  });

  // ── 5. Concurrency / rate limiting ─────────────────────────────────────
  runner.suite('Concurrency & rate limiting');

  await runner.run('20 parallel createContact calls do not crash', async () => {
    const promises = Array.from({ length: 20 }, () => {
      const n = makeTestName('Concurrent');
      return adapter.createContact({
        firstName: `${TEST_TAG} ${n.firstName}`,
        lastName: n.lastName,
        phone: makeTestPhone(),
      });
    });
    const results = await Promise.all(promises);
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      // Some may legitimately hit rate limit; that's still a useful signal.
      throw new Error(
        `${failed.length}/20 failed. First error: ${failed[0].error}`,
      );
    }
    results.forEach((r) => r.externalId && contactIds.push(r.externalId));
    return { notes: `${results.length} succeeded` };
  });

  // ── 6. Idempotency ─────────────────────────────────────────────────────
  runner.suite('Idempotency (KNOWN BEHAVIOR — adapter does not dedupe)');

  await runner.run('Same phone + name twice → two contacts (no dedupe)', async () => {
    const phone = makeTestPhone();
    const name = makeTestName('Dup');
    const r1 = await adapter.createContact({
      firstName: `${TEST_TAG} ${name.firstName}`,
      lastName: name.lastName,
      phone,
    });
    const r2 = await adapter.createContact({
      firstName: `${TEST_TAG} ${name.firstName}`,
      lastName: name.lastName,
      phone,
    });
    if (!r1.success || !r2.success) throw new Error('Expected both to succeed');
    if (r1.externalId === r2.externalId) {
      throw new Error(
        'Got same ID twice — unexpected. HubSpot is now deduping; adapter behavior changed.',
      );
    }
    if (r1.externalId) contactIds.push(r1.externalId);
    if (r2.externalId) contactIds.push(r2.externalId);
    return {
      notes: `created ${r1.externalId} AND ${r2.externalId} — adapter should upsert in v2`,
    };
  });

  // ── 7. Cleanup hint ────────────────────────────────────────────────────

  const s = runner.summary();

  console.log(
    `${c.gray}Created during this run: ${contactIds.length} contacts (deals associated automatically).${c.reset}`,
  );
  if (contactIds.length > 0) {
    console.log(
      `${c.gray}Run ${c.cyan}npm run test:hubspot:cleanup${c.gray} to remove them.${c.reset}\n`,
    );
  }

  exitFromSummary(s);
}

main().catch((err) => {
  console.error(`${c.red}Unexpected edge-case-test error:${c.reset}`, err);
  process.exit(1);
});
