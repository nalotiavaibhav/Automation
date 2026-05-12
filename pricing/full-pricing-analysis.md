# Flowmax — Full Pricing & Unit-Economics Analysis

> **Date:** May 2026 · **Status:** Draft v1 · **Owner:** Vaibhav
>
> **Purpose:** Total cost of goods sold (COGS) per customer, competitive benchmark vs Phonely, and proposed customer-facing pricing for an early-stage launch — including how much free usage we can sustainably offer.
>
> **Companion doc:** `sms-twilio-pricing.md` (deep-dive on SMS alert costs only).

---

## 0. Summary for the impatient

- **Our true COGS** for a typical SMB customer at 200 min/mo: **~$30–50/month**, of which Vapi is 95%. Supabase is free at this scale. SMS alerts are <$1.
- **Phonely's pricing:** Free 100 min → Starter $50/mo (250 min, $0.25/min over) → Pro $150/mo (750 min, $0.30/min over) → Enterprise $0.05/min custom.
- **Recommended Flowmax launch pricing:**

| Tier | Monthly | Included | Overage | Target |
|---|---|---|---|---|
| **Design Partner** (first 10 customers) | $0 for 3 mo, then Starter | 200 min | — | Friends, testimonials, referenceability |
| **Starter** | $49/mo | 200 min | $0.30/min | Solo plumber/electrician/clinic |
| **Pro** | $149/mo | 700 min | $0.25/min | Small business with assistant role |
| **Enterprise** | Custom (~$0.18/min effective) | Unlimited | — | Multi-location, dispatch-heavy |
| **Free trial** | $0 for 14 days | 50 min | — | New signups, self-serve |

- **Free-usage we can sustain right now:** 14-day trial with 50 minutes (cost exposure ≤$10/trial user). **Do not offer a permanent free tier.** We don't yet have product-market fit, and Phonely's perpetual 100-min free tier is funded by their Series A — we'd be subsidizing strangers with our runway.

---

## 1. Cost stack: what we pay per customer per month

For one realistic SMB customer using the product at typical volume (200 minutes of voice = roughly 100 calls):

### 1.1 Vapi (voice AI orchestration) — **the dominant cost**

Vapi's $0.05/min platform fee is the marketed price, but the *real* all-in number includes the LLM, STT, TTS, and telephony layers underneath.

| Component | Per-minute cost | Notes |
|---|---|---|
| Vapi platform / orchestration | $0.05 | Fixed |
| STT (Deepgram or Whisper) | $0.01 | ~$0.0043/min Nova-3, $0.006/min Whisper |
| LLM — GPT-4o or Claude Sonnet 4.6 | $0.02 – $0.10 | Depends on context window, tool use |
| LLM — GPT-4 or Claude Opus (premium) | $0.10 – $0.20 | Skip for SMB use case |
| TTS — ElevenLabs Turbo | $0.07 | Most natural; the right default |
| TTS — PlayHT or Cartesia | $0.04 | Slightly cheaper, similar quality |
| Telephony — Twilio (call carriage) | $0.014 – $0.04 | $0.0085/min via Twilio's "Programmable Voice", + Twilio number rental $1.15/mo |
| **Realistic all-in / minute** | **$0.15 – $0.25** | Lean stack: Deepgram + GPT-4o + Cartesia ≈ $0.15. Premium: ElevenLabs + Claude Sonnet ≈ $0.22 |

**At 200 min/mo per customer:** $30 – $50 in Vapi cost. That's it. That's the whole COGS conversation.

> **Hidden cost gotcha:** Vapi bills you for every minute the agent is active, including silent hold periods. If our prompt design lets the AI awkwardly pause, we're paying for the silence. Worth tuning prompts to keep calls under 90 seconds whenever possible.

### 1.2 Supabase (database, auth, storage) — **free at our scale**

Free tier specs:
- 500 MB database
- 1 GB file storage (we'd use this for call recordings — see note below)
- 5 GB egress / mo
- 50,000 MAU (way more than we'll have)
- 500,000 edge function invocations / mo
- **Caveat:** project pauses after 1 week of inactivity. Not safe for production once we have paying customers.

**Pro tier ($25/mo):** 8 GB DB, 100 GB storage, 250 GB egress, never pauses. **This is where we should land for production**, paid by us (not the customer) because it's shared infrastructure.

**Recording storage math:** A 90-second call recording in 64 kbps mono MP3 is ~720 KB. At 100 calls/customer/month × 50 customers = 5,000 recordings/mo = ~3.6 GB. We'd hit the 1 GB free-tier ceiling at **~15 customers**. Pro tier handles ~140 customers before storage overage kicks in.

**Multi-tenancy strategy:** One Supabase project, all customers in shared tables with Row-Level Security (RLS) policies keyed on `business_id`. This is the standard SaaS pattern and is what Supabase's RLS is designed for. The codebase currently has `DEFAULT_BUSINESS_ID = 'default'` — that needs to become a real foreign key.

**Estimated Supabase COGS per customer:**

| Customer count | Supabase plan | Monthly cost | $ / customer |
|---|---|---|---|
| 1 – 10 (early pilots) | Free | $0 | $0.00 |
| 10 – 50 | Pro ($25/mo) | $25 | $0.50 – $2.50 |
| 50 – 140 | Pro + storage overage | $30 – $50 | $0.20 – $1.00 |
| 140 – 500 | Pro + storage + compute | $60 – $120 | $0.12 – $0.85 |

Effectively **negligible per customer**.

### 1.3 Twilio SMS alerts — **negligible**

See `sms-twilio-pricing.md` for the full breakdown. Per-customer summary:

- Fixed cost: $6.65/mo for the whole platform (one shared number + 10DLC)
- Variable cost: ~$0.027 / urgent alert
- Per-customer expected: ~$0.50/mo at 20 alerts, ~$2.50 at 100 alerts
- One-time setup: ~$20 in registration fees, first month only

### 1.4 Deployment & hosting

| Service | Free tier | Paid tier we'd need | Notes |
|---|---|---|---|
| **Vercel** (Next.js hosting) | Hobby: 100 GB bandwidth, no commercial use | Pro $20/mo | Required for production — Hobby disallows commercial use |
| **Domain** | — | ~$12/yr | Already owned (flowmax / vanglabs) |
| **Email (SendGrid / Resend)** | 100 emails/day free | Resend free 3K/mo → $20/mo for 50K | Onboarding, password reset, alert backup channel |
| **Error monitoring (Sentry)** | 5K errors/mo free | $26/mo | Skip until we have paying customers |
| **Analytics (PostHog)** | 1M events/mo free | $0 until much later | Free tier is enormous |

**Total platform-level fixed cost in production:** $20 (Vercel) + $25 (Supabase Pro) + $7 (Twilio) + $20 (Resend) ≈ **$72/mo regardless of customer count**.

### 1.5 Per-customer COGS — total

For an SMB customer using 200 voice minutes/month with 20 urgent alerts:

| Component | Cost |
|---|---|
| Vapi (200 min × $0.18 lean stack) | $36.00 |
| Twilio SMS alerts (20 × $0.027) | $0.54 |
| Supabase share (amortized at 50 customers) | $0.50 |
| Vercel/Resend share (amortized at 50 customers) | $0.80 |
| **Total per customer** | **~$38 / month** |

At a premium stack (ElevenLabs + Claude Sonnet, $0.22/min), the Vapi line becomes $44 → total ~**$46/customer/mo**.

**Range to memorize: $35–50 per active SMB customer per month.**

---

## 2. Competitive landscape

### 2.1 Phonely (the closest analog — YC W23, in our exact lane)

From phonely.ai/pricing:

| Plan | Monthly | Annual | Minutes | Overage | Per-min effective |
|---|---|---|---|---|---|
| Free | $0 | $0 | 100 (~50 calls) | N/A (hard cap) | $0 |
| Starter | $50 | $33/mo | 250 | $0.25 / min | $0.20 included, $0.25 over |
| Pro | $150 | $100/mo | 750 | $0.30 / min | $0.20 included, $0.30 over |
| Enterprise | Custom | Custom | Custom | $0.25 / min | $0.05 platform + passthrough |

Observations:
- Phonely's **per-minute equivalent at included quota is $0.20**. Their COGS is roughly the same as ours ($0.15–0.22/min), so they're running on **~10–25% gross margin at the Starter tier and ~30–40% at Pro**.
- They monetize overages — that's where the margin actually lives. Customers who consistently overage are paying $0.25–0.30/min on what costs Phonely $0.18.
- **Their free tier (100 min/mo) costs them ~$15–22 per free user per month.** They're absorbing that as a CAC line item. We can't yet.
- The 33% annual discount means they're effectively saying "lock in for the year and we'll halve our margin" — classic SaaS retention play.

### 2.2 Other comparable players (US/India market, May 2026)

| Company | Pricing | Notes |
|---|---|---|
| **Phonely.ai** | $50 / $150 / Enterprise | YC W23, closest analog |
| **Bland.ai** | $0.09/min + LLM/TTS passthrough | Lower base, but quality lags |
| **Retell AI** | $0.07/min platform + components | Vapi competitor, similar economics |
| **Ringly.io** | $99/mo (60 min) → $499/mo (500 min) | Premium positioning, higher per-min |
| **Air.ai** | ~$300/mo flat, unlimited (in theory) | Enterprise pitch, opaque pricing |
| **Synthflow.ai** | $29 / $99 / $249 | India-friendly pricing |
| **Dialzara** | $59 / $99 / $199 | Direct SMB receptionist competitor |
| **NextPhone / Aira** | $29 – $300 | Wide range, mostly mid-market |

**Market price band for SMB AI receptionists: $29 – $300/month** for entry-to-mid tiers, with per-minute equivalents of $0.15 – $0.48.

### 2.3 Where we'd position

If we price below Phonely, we look cheap-but-unestablished — bad signal. If we price above without a clear feature advantage, we won't convert. **Match Phonely on Starter (essentially), differentiate on integrations (HubSpot + Zoho + ServiceTitan + Housecall Pro already shipped or in flight) and the emergency-alert mobile trigger, which Phonely does not advertise.**

---

## 3. Recommended pricing tiers

### 3.1 Tier table (proposed)

| Tier | Monthly | Annual (–20%) | Included min | Overage | Gross margin (at included quota) |
|---|---|---|---|---|---|
| **Free trial** | $0 (14 days only) | — | 50 | none, hard cap | N/A — CAC cost |
| **Starter** | $49 | $39/mo | 200 | $0.30/min | ~25% ($36 COGS / $49 rev) |
| **Pro** | $149 | $119/mo | 700 | $0.25/min | ~15% ($126 COGS / $149 rev) at full quota; ~75% if customer uses 200 min |
| **Enterprise** | Custom (target $0.18/min effective) | Custom | Custom / unlimited | Volume-tiered | Negotiated, target ≥25% |

**Why these numbers:**
- **Starter $49**: One dollar below Phonely's $50 — psychologically meaningful, doesn't trigger "they're undercutting" alarms. 200 min is 80% of Phonely's 250 min but a friendlier price tag.
- **Pro $149**: One dollar below Phonely's $150. Same trick. We trade 50 minutes (700 vs 750) for a cheaper overage rate ($0.25 vs $0.30), which actually *favors* heavy users — who are exactly the customers we want to retain.
- **Annual discount 20%**: More conservative than Phonely's 33%. We don't have their unit-economics confidence yet.

### 3.2 What's included in every tier

- HubSpot, Zoho, ServiceTitan, Housecall Pro integrations (already in code)
- Emergency SMS alerts to owner (the feature we're designing)
- Call recordings + transcripts (90-day retention; longer on Pro/Enterprise)
- Real-time dashboard with Excel-like call log
- Customizable AI agent prompt
- Single phone number (Twilio long code, included)
- Email support

### 3.3 What gates each tier

| Feature | Starter | Pro | Enterprise |
|---|---|---|---|
| Minutes included | 200 | 700 | Custom |
| AI assistants per account | 1 | 3 | Unlimited |
| Phone numbers | 1 | 3 | Unlimited |
| CRM integrations | 1 active | All | All + custom |
| Emergency SMS recipients | 1 | 3 | Unlimited |
| Call recording retention | 90 days | 365 days | Custom |
| Voice options | Standard library | Premium (ElevenLabs full) | Custom voice cloning |
| API access | ❌ | ✅ | ✅ + dedicated rate limits |
| SLA | Best effort | 99.5% | 99.9% + dedicated support |
| HIPAA BAA | ❌ | ❌ | ✅ (need Supabase Team + paperwork) |

---

## 4. Free-usage policy for an early-stage startup

The user's question: *"How much free usage can we provide to someone since we are at a very initial level?"*

The honest answer: **less than we want to**, but enough to remove activation friction.

### 4.1 The math of "free"

Each free trial user costs us, in the worst case:
- 50 free voice minutes × $0.18 = $9
- Twilio SMS alerts during trial = ~$1
- **Worst-case exposure: ~$10 per trial user**

If 100 people start a trial and 10% convert at $49/mo → $490 MRR vs $1,000 in trial COGS, payback in ~2 months. **That's healthy.**

If we instead offer Phonely-style perpetual 100-min free tier:
- Each free user costs ~$18/mo perpetually
- Conversion to paid is typically 3–8% for freemium
- 100 free users × $18/mo = $1,800/mo burn for 4–6 paying conversions = $200–300 MRR
- **Negative unit economics until we have a clear conversion funnel and lots of users.**

### 4.2 Recommended free policy for the next 6 months

| Mechanism | Detail | Cost exposure |
|---|---|---|
| **14-day free trial** | Self-serve signup, 50 minutes, all features, credit card not required | ≤$10 per trial user |
| **Design partner program** | First 10 customers get 3 months free in exchange for a written case study + 30-min monthly call | ≤$450 total (10 × $45 × 3 mo) |
| **Referral credit** | Existing paying customer gets 1 month free for every customer they refer who pays for 2+ months | Self-funding — only triggers on retained referrals |
| **Annual prepay discount** | 20% off if customer pays 12 months upfront | We give up margin, but get cash + retention |

**Not recommended:**
- Perpetual freemium tier (Phonely-style)
- More than 14 days of trial
- "Pay-what-you-want" / open-ended free usage

### 4.3 Free-tier review trigger

Revisit this policy when:
- We hit 25 paying customers (proves the price point converts)
- OR we close a funding round of >$500K (have runway to subsidize freemium)
- OR conversion data shows trial→paid conversion >15% (we can afford to give more)

---

## 5. Multi-tenant data model (what pricing implies for the code)

Charging customers requires multi-tenancy. The current code has none. Specifically:

| Concern | Current state | What we need |
|---|---|---|
| Tenant identity | `DEFAULT_BUSINESS_ID = 'default'` in `app/api/webhooks/vapi/route.ts` | A `businesses` table, FK on every call/contact/integration row |
| Auth | Not visible in scanned files — appears unscaffolded | Supabase Auth with one user → many businesses, or one business → many users |
| RLS policies | None | Per-table RLS keyed on `business_id` |
| Billing | None | Stripe Customer + Subscription, webhook → update `businesses.plan` |
| Usage metering | Per-call `cost` already captured in `Call` type | Aggregate into `usage_meter` table; cron daily roll-up |
| Vapi assistant per tenant | Hardcoded mapping (see `vapi-extractor.ts`) | `businesses.vapi_assistant_id` + outbound calls scoped per tenant |

**This is the actual gating work for monetization.** Pricing is the easy part. Multi-tenancy + Stripe + usage metering is ~2–3 weeks of focused engineering work.

---

## 6. Risks and assumptions

1. **Vapi may change pricing.** They've adjusted twice since launch. If their platform fee moves to $0.07/min, our margins compress 10–15%. Mitigation: review quarterly, lock in annual contracts if Vapi offers them.
2. **TTS quality vs cost.** If we use Cartesia at $0.04/min instead of ElevenLabs at $0.07/min, we save $6/mo per customer but ~5% of users will notice and complain about robotic voice. Worth A/B testing.
3. **Storage growth from recordings.** Long calls + long retention = Supabase storage costs grow non-linearly. Set 90-day default retention and move older recordings to Cloudflare R2 ($0.015/GB) or delete.
4. **Emergency alerts must be reliable.** If we miss a single emergency alert because Twilio queued it during 10DLC throttling, that's a churn event. Register 10DLC the day we decide to launch this feature.
5. **Phonely could price-cut.** They have YC capital and could go to $29/mo to grab market share. Our defense is integrations depth (HubSpot/Zoho/ServiceTitan/HCP) and the emergency-mobile trigger — not price.
6. **We have not yet validated willingness to pay.** All of this is theoretical until we put a Stripe checkout in front of a real plumber and see what happens. **The single most valuable thing we can do this month is get one customer to pay $49.**

---

## 7. Roadmap implication

For the urgent-alert feature design we started discussing: the SMS cost is negligible, so cost is **not** a design constraint. Design for UX (acknowledgement loop, escalation if not ACKed in 60 seconds, weekly digest of alert performance) — not for pinching pennies on segment counts.

For the docs site: this is a CAC line item, not a COGS line item. Industry-grade docs cost more in time than in dollars. Mintlify or Fumadocs are both free for the volume we'd push.

---

## 8. Sources

- Phonely pricing (live): https://www.phonely.ai/pricing
- Vapi pricing (live + analysis): https://vapi.ai/pricing · https://www.cloudtalk.io/blog/vapi-ai-pricing/
- Supabase pricing (live): https://supabase.com/pricing
- Twilio US SMS pricing: https://www.twilio.com/en-us/sms/pricing/us
- Twilio A2P 10DLC fees: https://help.twilio.com/articles/1260803965530-What-pricing-and-fees-are-associated-with-the-A2P-10DLC-service-
- Competitive analysis: https://www.getnextphone.com/blog/ai-receptionist-cost · https://ai-receptionist.com/blog/ai-receptionist-cost-and-pricing-guide/
- Deepgram STT pricing: https://deepgram.com/pricing
- ElevenLabs TTS pricing: https://elevenlabs.io/pricing
- Resend email pricing: https://resend.com/pricing
- Vercel pricing: https://vercel.com/pricing
