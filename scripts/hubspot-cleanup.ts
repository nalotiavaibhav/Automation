/**
 * Cleanup — deletes every contact and deal whose name contains `[FLOWMAX-TEST]`.
 * Safe to run multiple times. Idempotent.
 *
 *   npm run test:hubspot:cleanup
 */
import 'dotenv/config';
import {
  banner,
  c,
  sym,
  loadEnv,
  makeHubSpotClient,
  TEST_TAG,
  deleteContactSilent,
  deleteDealSilent,
} from './_lib';

async function main(): Promise<void> {
  banner('HubSpot Cleanup — Remove Test Records');

  const { token } = loadEnv();
  if (!token) {
    console.log(`${c.red}HUBSPOT_PRIVATE_APP_TOKEN missing.${c.reset}\n`);
    process.exit(1);
  }
  const client = makeHubSpotClient(token);

  // ── Contacts ───────────────────────────────────────────────────────────
  console.log(`  ${sym.info} scanning contacts for ${c.cyan}${TEST_TAG}${c.reset}…`);

  // HubSpot Search API: filter contacts where firstname starts with the tag.
  let after: string | undefined;
  let deletedContacts = 0;
  let page = 0;
  do {
    page++;
    const search = await client.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'firstname',
              operator: 'CONTAINS_TOKEN' as never, // string-matching operator
              value: TEST_TAG,
            },
          ],
        },
      ],
      properties: ['firstname', 'lastname'],
      limit: 100,
      after,
      sorts: [],
    });
    const ids = search.results.map((r) => r.id);
    for (const id of ids) {
      await deleteContactSilent(client, id);
      deletedContacts++;
    }
    after = search.paging?.next?.after;
    if (ids.length > 0) {
      console.log(
        `     page ${page}: deleted ${ids.length} contacts (running total: ${deletedContacts})`,
      );
    }
  } while (after);

  // ── Deals ──────────────────────────────────────────────────────────────
  console.log(`\n  ${sym.info} scanning deals for ${c.cyan}${TEST_TAG}${c.reset}…`);
  after = undefined;
  let deletedDeals = 0;
  page = 0;
  do {
    page++;
    const search = await client.crm.deals.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'dealname',
              operator: 'CONTAINS_TOKEN' as never,
              value: TEST_TAG,
            },
          ],
        },
      ],
      properties: ['dealname'],
      limit: 100,
      after,
      sorts: [],
    });
    const ids = search.results.map((r) => r.id);
    for (const id of ids) {
      await deleteDealSilent(client, id);
      deletedDeals++;
    }
    after = search.paging?.next?.after;
    if (ids.length > 0) {
      console.log(
        `     page ${page}: deleted ${ids.length} deals (running total: ${deletedDeals})`,
      );
    }
  } while (after);

  // ── Done ───────────────────────────────────────────────────────────────
  console.log(
    `\n  ${sym.pass} ${c.green}cleanup complete:${c.reset} ${deletedContacts} contacts, ${deletedDeals} deals removed.`,
  );
  console.log(
    `  ${c.gray}Calls + meetings associated with deleted contacts are archived by HubSpot automatically.${c.reset}\n`,
  );
}

main().catch((err) => {
  console.error(`${c.red}Cleanup error:${c.reset}`, err);
  process.exit(1);
});
