# Testing Guide

How to verify the Flowmax HubSpot integration end-to-end, including edge cases that would otherwise only surface in production.

This guide is written for someone who has **never set up a HubSpot dev account before**. Follow it top-to-bottom and you'll go from "I don't know how to test this" to "I have a runnable verification suite that exercises 30+ checks against real HubSpot."

---

## 1. What you'll set up (5 minutes)

| Thing | Cost | Time | Why |
|---|---|---|---|
| HubSpot Free CRM account | $0 forever | 2 min | A sandbox where test records can be created/deleted without polluting real data |
| HubSpot Private App | $0 | 2 min | Generates a long-lived API token (no OAuth dance needed) |
| `.env.local` entries | — | 30 sec | One token in one env var |

When you're done you'll be able to run:

```bash
npm run test:preflight        # Verifies env + scopes
npm run test:hubspot:smoke    # Happy-path: create contact + deal + call + meeting
npm run test:hubspot:edge     # 15 edge cases (auth fail, bad input, concurrency, etc.)
npm run test:webhook          # Simulates a Vapi webhook against your running dev server
npm run test:hubspot:cleanup  # Deletes every test record (idempotent, safe to repeat)
```

---

## 2. Step-by-step setup

### 2.1 Create a HubSpot Free account

1. Go to https://www.hubspot.com/products/get-started-free
2. Use a **dedicated email** (e.g. `flowmax-dev@yourcompany.com`) — NOT your production HubSpot email. This becomes your test portal.
3. Pick "I'm building a product" or any role — doesn't matter.
4. Skip onboarding ("I'll do this later"). You don't need to import contacts.

You're now in a fresh HubSpot portal. Note the URL: it'll look like `https://app.hubspot.com/contacts/12345678/`. The `12345678` is your **portal ID**.

### 2.2 Create a Private App

> A "Private App" in HubSpot is the simplest way to get an API token without doing the OAuth dance. It's exactly what Flowmax's `.env.local` expects via `HUBSPOT_PRIVATE_APP_TOKEN`.

1. In the HubSpot top-right gear menu (⚙️) → **Account Setup** → **Integrations** → **Private Apps**
2. Click **Create a private app**
3. Tab: **Basic Info**
   - Name: `Flowmax AI Receptionist Test`
   - Description: any
   - Logo: skip
4. Tab: **Scopes** — this is the one that matters. Enable ALL of:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.objects.calls.read`
   - `crm.objects.calls.write`
   - `crm.objects.meetings.read`
   - `crm.objects.meetings.write`

   > The fastest way: type "contacts" in the search box, check both read+write; repeat for "deals", "calls", "meetings". Don't enable scopes you don't need — HubSpot's API rejects you if scopes drift from what was granted.

5. Click **Create app** in the top-right.
6. HubSpot shows you the token ONCE. It looks like `pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. **Copy it now.**
7. If you miss the popup: same screen → **Auth** tab → "Show token". Same value.

### 2.3 Drop it in `.env.local`

```bash
# .env.local (NOT .env.example — that's the public template)
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DEFAULT_CRM_PROVIDER=hubspot
DEFAULT_BUSINESS_ID=default
```

Save. **Don't commit `.env.local`** — it's gitignored.

### 2.4 Verify before going further

```bash
npm run test:preflight
```

You should see ~6 green checks. If anything is red, the error message tells you exactly what to fix (missing env var, wrong token shape, missing scope, network failure). Don't move on until preflight is fully green.

---

## 3. The test scripts

### 3.1 Preflight — `npm run test:preflight`

Runs in ~3 seconds. Verifies:

- `HUBSPOT_PRIVATE_APP_TOKEN` is set and looks like a Private App token
- The token reaches `api.hubapi.com` and identifies a real portal
- All 4 read scopes are granted (contacts, deals, calls, meetings)

**Run this before every other test.** Catches 90% of "why is everything failing" issues before they waste time.

### 3.2 Smoke test — `npm run test:hubspot:smoke`

Runs in ~10 seconds. Creates real records.

- ✓ getConnectionStatus returns connected
- ✓ createContact (full data: email, address, city, state, zip)
- ✓ createContact (minimum fields only)
- ✓ createDeal (associated to contact, stage=new)
- ✓ createDeal across all 5 generic stages (new → contacted → qualified → booked → completed)
- ✓ createDeal with unknown stage (falls back gracefully)
- ✓ logCall with full transcript + recording URL
- ✓ logCall with summary only
- ✓ bookAppointment for a 1-hour meeting tomorrow

After it runs, jump into HubSpot UI:
- **Contacts** → filter "First name contains `[FLOWMAX-TEST]`" → you should see them
- **Deals** → search `[FLOWMAX-TEST]` → all stage variants present
- Click any contact → **Activity** tab → call + meeting linked

### 3.3 Edge-case test — `npm run test:hubspot:edge`

Runs in ~30 seconds. The interesting one. Verifies behavior under stress and bad input:

| Category | What we test |
|---|---|
| Auth failure | Garbage token → adapter returns `success: false` instead of crashing |
| Phone formats | Same digits in different formats produce SEPARATE contacts (known limitation — adapter should normalize) |
| Special chars | Unicode, quotes, slashes, em-dashes in names |
| Empty optional fields | Don't get sent as empty strings |
| Long inputs | 200-char first name accepted |
| Huge transcripts | 200-turn conversation logs |
| Zero-duration calls | Hang-up before greeting |
| Control characters | NUL byte, vertical tab in transcript |
| Stage mapping | All 5 generic stages + HubSpot-native passthrough |
| Concurrency | 20 parallel createContact calls don't crash |
| Idempotency | Same phone twice → 2 contacts (known: adapter does not dedupe) |

**Important:** some of these tests are *expected to reveal known limitations*. They're flagged with "KNOWN BEHAVIOR" in their suite names. The pass criterion isn't "everything works perfectly" — it's "the adapter behaves predictably and doesn't crash."

If a known-limitation test starts passing differently (e.g. HubSpot rolls out auto-dedupe), that's signal that the world changed and your code may need to react.

### 3.4 Webhook simulator — `npm run test:webhook`

Tests the FULL pipeline (webhook → extractor → orchestrator → SMS + CRM).

Requires a running dev server in another terminal:

```bash
# Terminal 1:
npm run dev

# Terminal 2:
npm run test:webhook                   # routine call (no SMS)
npm run test:webhook -- --emergency    # emergency (SMS fires)
npm run test:webhook -- --no-booking   # call without an appointment booked
```

After running, inspect:
- Terminal 1 (`next dev`) console — look for `[CRM Sync]` and `[SMS]` log lines
- `/dashboard` in the browser — the synthesized call should appear with the right urgency badge
- HubSpot UI — new contact + deal + call log
- For `--emergency`: your `OWNER_ALERT_PHONE` (if configured) should receive an SMS within ~5 seconds

You can also point it at a deployed environment:

```bash
npm run test:webhook -- --url https://flowmax.app/api/webhooks/vapi --emergency
```

### 3.5 Cleanup — `npm run test:hubspot:cleanup`

Deletes every contact whose `firstname` contains `[FLOWMAX-TEST]` and every deal whose `dealname` contains the same. Idempotent — safe to run twice.

Run this:
- After every smoke + edge test session if you care about HubSpot record count
- Before showing the HubSpot account to anyone else

---

## 4. The full flow (what to actually run)

A typical full verification cycle:

```bash
# 1. Validate setup
npm run test:preflight

# 2. Run the test suites
npm run test:hubspot:smoke
npm run test:hubspot:edge

# 3. Test the full pipeline end-to-end
npm run dev &              # (or in another terminal)
sleep 5
npm run test:webhook                # routine
npm run test:webhook -- --emergency # emergency

# 4. Clean up
npm run test:hubspot:cleanup
```

If everything is green, the HubSpot integration is working end-to-end.

---

## 5. Troubleshooting

### "Token does not start with `pat-`"

You pasted an OAuth access token (starts with `CN...` or random chars). Private App tokens start with `pat-`. Go back to **Settings → Private Apps → [your app] → Auth tab → Show token**.

### "401 Unauthorized" from HubSpot

Token was revoked OR a scope you need was removed. Regenerate the token (Private Apps → app → Auth → Rotate token) and re-paste into `.env.local`.

### "Insufficient OAuth scopes"

The Private App is missing one of the 8 required scopes (see §2.2). Go back into the app → Scopes tab → enable the missing ones → save. You don't have to regenerate the token; just refreshing scopes is enough.

### Smoke test passes but webhook simulator's CRM records don't appear

The webhook handler does CRM sync as **fire-and-forget** — it returns 200 before sync completes. Wait 5–10 seconds, then check HubSpot. If still not there, look at the `next dev` terminal for `[CRM Sync] error:` lines.

### `npm run test:webhook` says "Could not reach localhost:3000"

`next dev` isn't running. Open another terminal and run `npm run dev`. Wait for "Ready in X seconds" before trying again.

### Cleanup deleted real production data

Cleanup ONLY targets records with `[FLOWMAX-TEST]` literally in the name field. As long as no real customer has that string in their first name or deal name, you're safe. If you're truly worried, use a brand-new HubSpot Free portal dedicated to testing.

### Rate-limit errors mid-run

Free HubSpot accounts have generous rate limits (100 requests / 10 seconds) but the edge test's 20-parallel-create burst can occasionally trip it. The base adapter has retry-with-backoff for 429s; if you see those in logs, they'll usually retry successfully. If you see actual failures, wait 60 seconds and re-run.

---

## 6. What's NOT covered yet

Honest list of gaps in this test harness:

- **Zoho integration tests** — Zoho requires the full OAuth dance with a callback URL, which isn't easy to script standalone. Future addition.
- **ServiceTitan integration tests** — needs a real ServiceTitan integration env account.
- **Twilio SMS path tests** — Twilio's test credentials make this scriptable; not yet wired. The webhook simulator with `--emergency` exercises the SMS dispatch path indirectly.
- **Vapi extractor unit tests** — the extractor parses unstructured payloads; worth dedicated tests with several real Vapi payload shapes. Future addition.
- **CRM sync orchestrator integration tests** — currently only tested via the webhook simulator. A dedicated unit test with mocked adapter would catch regressions faster.

These are all worth building if you scale past 10 customers. For now, the HubSpot suite covers the highest-risk surface.

---

## 7. A note on test-data hygiene

Every record this harness creates is prefixed with `[FLOWMAX-TEST]`. That's deliberate — it means cleanup is a one-liner search-and-delete. Don't change the prefix without updating `scripts/_lib.ts` and `scripts/hubspot-cleanup.ts` in lockstep.

For sandbox accounts, you can also just **delete the entire portal** (Settings → Account → Delete Portal) once you've moved off it. HubSpot Free accounts are disposable.
