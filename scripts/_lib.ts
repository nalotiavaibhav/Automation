/**
 * Shared helpers for the test scripts under `scripts/`.
 * - Console formatting (color + symbols)
 * - Test runner with pass/fail tracking
 * - HubSpot client + cleanup helpers
 * - Env validation
 */
import 'dotenv/config';
import { Client as HubSpotClient } from '@hubspot/api-client';

// ── ANSI color helpers ───────────────────────────────────────────────────
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

export const sym = {
  pass: `${c.green}✓${c.reset}`,
  fail: `${c.red}✗${c.reset}`,
  skip: `${c.yellow}∼${c.reset}`,
  info: `${c.blue}i${c.reset}`,
  arrow: `${c.dim}→${c.reset}`,
};

export function banner(title: string): void {
  const line = '─'.repeat(Math.min(title.length + 4, 70));
  console.log(`\n${c.bold}${c.cyan}${line}${c.reset}`);
  console.log(`${c.bold}${c.cyan}  ${title}${c.reset}`);
  console.log(`${c.bold}${c.cyan}${line}${c.reset}\n`);
}

export function section(title: string): void {
  console.log(`\n${c.bold}${title}${c.reset}`);
  console.log(`${c.gray}${'─'.repeat(Math.min(title.length + 2, 70))}${c.reset}`);
}

// ── Test runner ──────────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  durationMs: number;
  error?: string;
  notes?: string;
}

export class TestRunner {
  private results: TestResult[] = [];
  private currentSuite = '';

  suite(name: string): void {
    this.currentSuite = name;
    section(name);
  }

  async run(
    name: string,
    fn: () => Promise<{ notes?: string } | void>,
  ): Promise<void> {
    const start = Date.now();
    const fullName = this.currentSuite ? `${this.currentSuite} → ${name}` : name;
    try {
      const result = await fn();
      const durationMs = Date.now() - start;
      this.results.push({
        name: fullName,
        status: 'pass',
        durationMs,
        notes: result?.notes,
      });
      const noteStr = result?.notes ? `${c.gray} (${result.notes})${c.reset}` : '';
      console.log(
        `  ${sym.pass} ${name}${c.gray} (${durationMs}ms)${c.reset}${noteStr}`,
      );
    } catch (err) {
      const durationMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      this.results.push({
        name: fullName,
        status: 'fail',
        durationMs,
        error: message,
      });
      console.log(
        `  ${sym.fail} ${name}${c.gray} (${durationMs}ms)${c.reset}`,
      );
      console.log(`      ${c.red}${message.split('\n').join('\n      ')}${c.reset}`);
    }
  }

  skip(name: string, reason: string): void {
    const fullName = this.currentSuite ? `${this.currentSuite} → ${name}` : name;
    this.results.push({ name: fullName, status: 'skip', durationMs: 0, notes: reason });
    console.log(`  ${sym.skip} ${name}${c.gray} — ${reason}${c.reset}`);
  }

  summary(): { passed: number; failed: number; skipped: number; total: number } {
    const passed = this.results.filter((r) => r.status === 'pass').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;
    const skipped = this.results.filter((r) => r.status === 'skip').length;
    const total = this.results.length;

    section('Summary');
    console.log(`  ${sym.pass} ${c.green}${passed} passed${c.reset}`);
    if (failed > 0) console.log(`  ${sym.fail} ${c.red}${failed} failed${c.reset}`);
    if (skipped > 0) console.log(`  ${sym.skip} ${c.yellow}${skipped} skipped${c.reset}`);
    console.log(`  ${sym.info} ${c.gray}${total} total${c.reset}\n`);

    if (failed > 0) {
      console.log(`${c.bold}${c.red}Failed tests:${c.reset}`);
      this.results
        .filter((r) => r.status === 'fail')
        .forEach((r) => {
          console.log(`  ${sym.fail} ${r.name}`);
          if (r.error) {
            console.log(`     ${c.gray}${r.error.split('\n')[0]}${c.reset}`);
          }
        });
      console.log('');
    }

    return { passed, failed, skipped, total };
  }

  results_(): readonly TestResult[] {
    return this.results;
  }
}

// ── Env validation ───────────────────────────────────────────────────────

export interface RequiredEnv {
  HUBSPOT_PRIVATE_APP_TOKEN?: string;
}

export function loadEnv(): { token: string | null; missing: string[] } {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? null;
  const missing: string[] = [];
  if (!token) missing.push('HUBSPOT_PRIVATE_APP_TOKEN');
  return { token, missing };
}

// ── HubSpot helpers ──────────────────────────────────────────────────────

export function makeHubSpotClient(token: string): HubSpotClient {
  return new HubSpotClient({ accessToken: token });
}

export const TEST_TAG = '[FLOWMAX-TEST]';
export const TEST_PHONE_PREFIX = '+15550199'; // E.164, unlikely to collide with real numbers

/**
 * Generate a unique test phone like +155501990000034521 so we can identify
 * (and later clean up) records created by the test scripts.
 */
export function makeTestPhone(): string {
  const suffix = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `${TEST_PHONE_PREFIX}${suffix}`;
}

export function makeTestName(suffix = ''): { firstName: string; lastName: string } {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  return {
    firstName: 'Flowmax-Test',
    lastName: `${suffix || 'Contact'}-${stamp}`,
  };
}

/**
 * Delete a contact by ID, silencing 404s.
 */
export async function deleteContactSilent(
  client: HubSpotClient,
  id: string,
): Promise<void> {
  try {
    await client.crm.contacts.basicApi.archive(id);
  } catch {
    /* ignore */
  }
}

/**
 * Delete a deal by ID.
 */
export async function deleteDealSilent(
  client: HubSpotClient,
  id: string,
): Promise<void> {
  try {
    await client.crm.deals.basicApi.archive(id);
  } catch {
    /* ignore */
  }
}

// ── Process exit helper ──────────────────────────────────────────────────

export function exitFromSummary(summary: { failed: number }): never {
  process.exit(summary.failed > 0 ? 1 : 0);
}
