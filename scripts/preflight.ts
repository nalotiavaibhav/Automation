/**
 * Preflight check — verifies the test environment is set up correctly.
 * Run this FIRST before any other test script. Fails fast with actionable
 * remediation if env vars or HubSpot credentials are missing/invalid.
 *
 *   npm run test:preflight
 */
import {
  banner,
  c,
  sym,
  TestRunner,
  loadEnv,
  makeHubSpotClient,
  exitFromSummary,
} from './_lib';

const HUBSPOT_REQUIRED_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.objects.calls.read',
  'crm.objects.calls.write',
  'crm.objects.meetings.read',
  'crm.objects.meetings.write',
];

async function main(): Promise<void> {
  banner('Flowmax Preflight — Test Environment Check');

  const runner = new TestRunner();
  const { token, missing } = loadEnv();

  // ── 1. Env vars ────────────────────────────────────────────────────────
  runner.suite('Environment variables');

  await runner.run('HUBSPOT_PRIVATE_APP_TOKEN is set', async () => {
    if (!token) {
      throw new Error(
        'Missing HUBSPOT_PRIVATE_APP_TOKEN.\n' +
          'Add it to .env.local. See TESTING.md for how to get a token.',
      );
    }
    if (!token.startsWith('pat-')) {
      throw new Error(
        `Token does not start with "pat-" (got "${token.slice(0, 8)}...").\n` +
          'Private App tokens look like "pat-na1-..." or "pat-eu1-...".\n' +
          'Did you paste an OAuth access token by mistake?',
      );
    }
    return { notes: `${token.slice(0, 10)}…${token.slice(-4)}` };
  });

  if (missing.length > 0) {
    console.log(
      `\n${c.red}${sym.fail} Cannot continue — missing env vars:${c.reset}`,
    );
    missing.forEach((m) => console.log(`    ${c.red}- ${m}${c.reset}`));
    console.log(`\n${c.gray}See TESTING.md for setup steps.${c.reset}\n`);
    process.exit(1);
  }

  // ── 2. HubSpot API reachability ────────────────────────────────────────
  runner.suite('HubSpot API reachability');

  const client = makeHubSpotClient(token!);

  await runner.run('Can reach api.hubapi.com', async () => {
    const start = Date.now();
    const res = await fetch('https://api.hubapi.com/integrations/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const elapsedMs = Date.now() - start;
    if (!res.ok) {
      throw new Error(
        `HubSpot returned ${res.status} ${res.statusText}.\n` +
          (res.status === 401
            ? 'Token is invalid or revoked. Generate a new Private App token.'
            : `Body: ${await res.text().catch(() => '')}`),
      );
    }
    return { notes: `${elapsedMs}ms` };
  });

  await runner.run('Token has portal access', async () => {
    const res = await fetch('https://api.hubapi.com/integrations/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = (await res.json()) as {
      portalId?: number;
      hubDomain?: string;
      appId?: number;
    };
    if (!data.portalId) {
      throw new Error('Response did not include a portalId — token may be malformed.');
    }
    return {
      notes: `portalId=${data.portalId} domain=${data.hubDomain ?? 'unknown'}`,
    };
  });

  // ── 3. Required scopes ─────────────────────────────────────────────────
  runner.suite('Required scopes');

  // Probe each scope by attempting a minimal call that requires it.
  // We use HEAD/GET shapes that don't mutate data.

  await runner.run('Read contacts (crm.objects.contacts.read)', async () => {
    await client.crm.contacts.basicApi.getPage(1);
  });

  await runner.run('Read deals (crm.objects.deals.read)', async () => {
    await client.crm.deals.basicApi.getPage(1);
  });

  await runner.run('Read calls (crm.objects.calls.read)', async () => {
    await client.crm.objects.calls.basicApi.getPage(1);
  });

  await runner.run('Read meetings (crm.objects.meetings.read)', async () => {
    await client.crm.objects.meetings.basicApi.getPage(1);
  });

  // Write scopes — we don't actually write here (that's the smoke test's job),
  // we just rely on the read scopes implying the symmetric write was granted
  // (per HubSpot's UI which requires both as a pair). The actual create test
  // is in `hubspot-smoke.ts`.
  console.log(
    `\n${sym.info} ${c.gray}Write scopes (.write) are verified by hubspot-smoke.ts when it creates records.${c.reset}`,
  );

  // ── 4. Required scopes list reference ──────────────────────────────────
  runner.suite('Scope checklist (reference)');
  console.log(`  ${c.gray}Flowmax's HubSpot adapter requires ALL of:${c.reset}`);
  HUBSPOT_REQUIRED_SCOPES.forEach((s) => console.log(`    ${c.gray}- ${s}${c.reset}`));

  // ── Done ───────────────────────────────────────────────────────────────
  const s = runner.summary();
  if (s.failed === 0) {
    console.log(
      `${c.green}${c.bold}Preflight passed.${c.reset} ${c.gray}Safe to run:${c.reset}`,
    );
    console.log(`  ${c.cyan}npm run test:hubspot:smoke${c.reset}`);
    console.log(`  ${c.cyan}npm run test:hubspot:edge${c.reset}\n`);
  } else {
    console.log(
      `${c.red}${c.bold}Preflight failed.${c.reset} Fix the issues above before running other tests.\n`,
    );
  }
  exitFromSummary(s);
}

main().catch((err) => {
  console.error(`${c.red}Unexpected preflight error:${c.reset}`, err);
  process.exit(1);
});
