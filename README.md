# Flowmax AI Receptionist

24/7 AI receptionist that answers business calls, captures structured data, syncs to your CRM, and texts the owner the moment an emergency comes in.

Built on Next.js 16 (App Router) + React 19 + Tailwind 4 + Vapi voice AI.

## Getting Started

```bash
cp .env.example .env.local   # fill in real values
npm install
npm run dev
```

Open http://localhost:3000.

## Features

- **Real-time call dashboard** — Excel-like sortable/filterable call log with emergency highlighting
- **Slide-out call detail** — transcript, audio playback, urgency, outcome
- **CRM sync** — HubSpot, Zoho, ServiceTitan, Housecall Pro adapters; one call → contact + deal + appointment + log
- **Urgent SMS alerts** — when Vapi marks a call `urgency='emergency'`, the owner gets an SMS within seconds
- **Product docs** at `/docs` — integration guides, quickstart, security, pricing FAQ

## Environment Variables

See `.env.example`. The non-obvious ones:

- `DEFAULT_BUSINESS_ID` — single-tenant placeholder. Real multi-tenancy is a separate future project.
- `NEXT_PUBLIC_APP_URL` — base URL used to build the deep link inside the emergency SMS.
- `OWNER_TIMEZONE` — IANA tz name used to format the SMS timestamp (default `America/New_York`).
- `OWNER_ALERT_PHONE` — single owner phone for v1. Multi-recipient escalation is out of scope.

## Pre-launch Checklist

### A2P 10DLC Registration (REQUIRED before production SMS)

US carriers throttle unregistered business SMS by 30-70%. Without this step, emergency alerts will arrive late or not at all.

1. **Brand registration** — Twilio Console → Messaging → Regulatory Compliance → A2P 10DLC. Choose **Low Volume Standard** unless you'll exceed ~3,000 msgs/day. Fees: $4.50 one-time + $4/mo. Approval: 1-3 business days.
2. **Campaign registration** — Use case: **Account Notifications** (operational, not marketing). Sample message: paste the template from `lib/notifications/sms.ts::buildBody`. Include "Reply STOP to unsubscribe" in the help docs. Fees: $15 one-time + $1.50/mo.
3. **Attach `TWILIO_FROM_PHONE`** to the approved campaign. Until then, use Twilio test credentials.

### Twilio test credentials (for local dev)

Set `TWILIO_ACCOUNT_SID` to your Test SID + `TWILIO_AUTH_TOKEN` to the Test Auth Token (Twilio Console → Account → Keys & Credentials).

Magic test numbers:
- `+15005550006` (FROM) — always succeeds
- `+15005550001` (TO) — returns invalid-number error
- No real SMS is sent and no charges incurred.

### Vapi assistant configuration

The webhook at `/api/webhooks/vapi` only acts on `end-of-call-report` events. For the emergency alert to fire, the Vapi assistant must classify `urgency='emergency'` in its end-of-call structured output. Examples to put in the prompt:

- "Burst pipe", "water spraying", "gas smell", "no heat in winter" → emergency
- "Need an appointment", "want a quote", "schedule a service" → routine

## Pricing analysis

See `pricing/sms-twilio-pricing.md` and `pricing/full-pricing-analysis.md`. **The `pricing/` directory is internal — do not publish to docs.**

## Architecture notes

- **Vapi webhook → sync-orchestrator**: emergency SMS fires as **Step 0** (`lib/crm/sync-orchestrator.ts`), before any CRM call. So an outage in HubSpot/Zoho cannot drop an emergency alert.
- **Persistence of alert events**: Twilio is the source of truth. The dashboard queries `/api/alerts?callId=...` which calls `messages.list` against Twilio with a `body LIKE '%/calls/<id>%'` heuristic. No DB table for alerts in v1.
- **Tenancy**: single-business v1. `DEFAULT_BUSINESS_ID = 'default'` is hardcoded. Multi-tenant + Stripe billing is a separate project.
- **Docs**: built with Fumadocs (in-repo MDX). Public, no auth. Routes under `/docs/*`.
- **Animations**: Framer Motion (`motion` package) wrapped in `<MotionConfig reducedMotion="user">` at AppShell root. Honors `prefers-reduced-motion`.

## Deployment

Vercel, single project. The Vapi webhook needs `runtime = 'nodejs'` (already set) — the Twilio SDK is not edge-compatible.
