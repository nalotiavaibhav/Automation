# SMS Pricing — Urgent-Alert Notifications via Twilio

> **Scope:** Cost of the urgent-issue → owner SMS notification feature only. For full unit economics across Vapi + Supabase + Twilio + tooling, see `full-pricing-analysis.md`.
>
> **Pricing as of:** May 2026 (Twilio US public pricing). Verify on https://www.twilio.com/en-us/sms/pricing/us and https://help.twilio.com/articles/1260803965530 before launch — A2P 10DLC fees changed in Aug 2025 and continue to evolve.
>
> **Geography assumed:** United States, sending from a US long code, business messaging via A2P 10DLC. International rates differ significantly and are listed at the end.

---

## TL;DR

| Volume scenario | Steady-state monthly cost | First-month cost (incl. one-time fees) |
|---|---|---|
| 1 customer × 20 alerts/mo | **~$7** | ~$30–55 |
| 1 customer × 100 alerts/mo | **~$9** | ~$30–55 |
| 10 customers × 20 alerts avg | **~$11** | ~$35–60 |
| 100 customers × 20 alerts avg | **~$55** | ~$80–100 |
| 100 customers × 100 alerts avg | **~$255** | ~$280–305 |

**Conclusion:** SMS is effectively free at our current scale. Fixed cost is ~$7/mo total for the whole platform (one shared sender number + 10DLC compliance), variable cost is ~$0.027 per emergency alert sent (2 segments outbound + half an ACK reply). The decision is *not* cost-driven — it's UX, deliverability, and country mix.

---

## 1. What Twilio actually charges

Twilio has **no monthly subscription**. There is no "plan" you pay for. Every dollar is either (a) fixed monthly fees that exist because the US carriers require them for legitimate business SMS, or (b) variable per-message costs.

### 1.1 Fixed monthly costs (paid even if you send zero messages)

| Line item | Cost | Notes |
|---|---|---|
| US local long code number (sender ID) | **$1.15 / mo** | One shared number is enough for all alerts — owners save "Flowmax Alerts" in contacts |
| A2P 10DLC Brand monthly fee (TCR) | **$4 / mo** | Per brand, not per number |
| A2P 10DLC Campaign monthly fee (Low Volume Standard, "Account Notification" use case) | **$1.50 / mo** | Per registered campaign |
| **Fixed subtotal** | **~$6.65 / mo** | Whole platform, not per customer |

### 1.2 One-time setup fees (paid once, in the first month only)

| Line item | Cost | Notes |
|---|---|---|
| A2P 10DLC Brand registration (Low Volume Standard) | **$4.50** one-time | If we register as Standard with secondary vetting, it's $46 instead |
| A2P 10DLC Campaign vetting | **$15** one-time | Per campaign use case |
| Brand vetting (optional, for higher throughput) | $15–40 | Skip until we need >3,000 msg/day |
| **Setup subtotal** | **~$19.50–$60** | First month only |

### 1.3 Variable per-message costs

| Direction | Twilio base | Avg carrier surcharge | All-in delivered cost |
|---|---|---|---|
| Outbound SMS (per segment, US long code) | $0.0083 | ~$0.004 (AT&T $0.0035, T-Mobile $0.0045, Verizon $0.0045) | **~$0.012 / segment** |
| Inbound SMS (per segment) | $0.0083 | $0 | **~$0.0083 / segment** |

**Segment math:** One SMS segment = 160 chars GSM-7 (or 70 chars if any emoji/unicode). A realistic urgent-alert payload is roughly:

```
🚨 EMERGENCY at True Service Plumbing
Caller: +1 555 123 4567 (John D.)
Issue: Burst pipe, water spraying garage
Time: 2:47 PM
Listen: flowmax.app/c/abc123
Reply ACK to acknowledge
```

That's ~220 characters with the emoji → **2 segments**, sometimes 3. We'll budget **2.5 segments outbound per alert** as a planning average, plus **0.5 segment inbound** assuming half the alerts get an "ACK" reply.

**Per-alert cost:** (2.5 × $0.012) + (0.5 × $0.0083) ≈ **$0.034 / alert**

If we drop the emoji and stay GSM-7-pure, we can usually get to 1.5 segments → ~$0.022/alert. Worth doing.

---

## 2. Cost projections

### 2.1 Single customer (pilot mode)

| Alerts / mo | Variable cost | + Fixed ($6.65) | = Total / mo |
|---|---|---|---|
| 5 | $0.17 | | **$6.82** |
| 20 | $0.68 | | **$7.33** |
| 50 | $1.70 | | **$8.35** |
| 100 | $3.40 | | **$10.05** |

> Realistic emergency volume for one SMB receptionist customer is **5–20 alerts/mo**, not 100. Plumbers and contractors hit 20+ only during winter freeze events or heat waves.

### 2.2 Scaling to multiple customers (shared sender number)

The fixed $6.65/mo is paid **once for the whole platform** — we don't need a separate Twilio number per customer for outbound alerts. Variable cost scales linearly.

| Customers | Avg alerts/mo each | Total alerts/mo | Variable cost | + Fixed | = Total |
|---|---|---|---|---|---|
| 10 | 20 | 200 | $6.80 | $6.65 | **$13.45** |
| 25 | 20 | 500 | $17.00 | $6.65 | **$23.65** |
| 50 | 20 | 1,000 | $34.00 | $6.65 | **$40.65** |
| 100 | 20 | 2,000 | $68.00 | $6.65 | **$74.65** |
| 100 | 50 | 5,000 | $170.00 | $6.65 | **$176.65** |
| 100 | 100 | 10,000 | $340.00 | $6.65 | **$346.65** |

**Per-customer SMS COGS** lands at **$0.07 – $0.68 / customer / mo** at all realistic volumes. Negligible.

### 2.3 First-month cost (one-time setup baked in)

| Customers | Recurring | One-time | First-month total |
|---|---|---|---|
| 1 (pilot) | $7–10 | ~$20 | **~$30** |
| 10 | $13 | ~$20 | **~$35** |
| 100 | $75 | ~$20 | **~$95** |

---

## 3. The 10DLC registration delay

The cost is small, but **the delay matters**. After we register the brand and campaign:
- **Sole Prop / Low Volume Standard** approval: typically **1–3 business days**
- **Standard brand with vetting**: **3–10 business days**
- Until approved, our outbound throughput is severely throttled (carriers may queue or drop)

**Recommendation:** Register the brand the same day we decide to ship the alert feature, regardless of when we'll actually launch. Brand registration is $4.50 one-time + $4/mo — it's cheap insurance against being blocked at launch.

---

## 4. WhatsApp as an alternative (cheaper, but with friction)

If our customers are in markets where WhatsApp is the default messenger (India, Brazil, Mexico, parts of EU/Africa), WhatsApp Business via Twilio is **3–5× cheaper** than US SMS:

| Region | Utility conversation rate (24-hr window) | Per-alert cost (1 conversation) |
|---|---|---|
| US | ~$0.0146 / conversation | ~$0.015 |
| India | ~$0.0035 / conversation | ~$0.004 |
| Brazil | ~$0.0045 / conversation | ~$0.005 |
| Mexico | ~$0.0157 / conversation | ~$0.016 |
| Indonesia | ~$0.0289 / conversation | ~$0.029 |

**No phone number rental, no 10DLC fees** — those are SMS-only concerns. The trade-offs are:
- One-time Meta Business verification (~1 day)
- Pre-approved message templates (we'd need 1–2 approved templates: "emergency_alert", "ack_reminder")
- Owner must have WhatsApp installed (~99% in India/LatAm, ~25% in US)
- Rich UX: interactive buttons ("Acknowledge", "Listen to call", "Call back")

**Recommendation:** SMS for US customers, WhatsApp for international. Build the SMS path first; WhatsApp is a 2-week incremental project once we know our customer mix.

---

## 5. International SMS pricing (for context)

If we serve customers outside the US, prices vary 3–10×. Sample rates (per outbound segment, May 2026):

| Country | Twilio outbound SMS / segment |
|---|---|
| United States | $0.0083 + carrier (~$0.012 all-in) |
| Canada | $0.0083 |
| United Kingdom | $0.040 |
| India | $0.0501 |
| Australia | $0.064 |
| Germany | $0.084 |
| Mexico | $0.0419 |

For India in particular, **SMS is 4× more expensive than WhatsApp**. If we're targeting the Indian market, WhatsApp is the clear default.

---

## 6. What we already have in the codebase

We don't need to build emergency detection from scratch — it's already classified:

- `types/index.ts` defines `urgency: 'routine' | 'urgent' | 'emergency'` on both `Call` and `Contact`
- `lib/crm/vapi-extractor.ts` extracts urgency from the Vapi end-of-call-report payload
- `app/api/webhooks/vapi/route.ts` is the trigger point — when `urgency === 'emergency'`, we'd dispatch the SMS

What's missing for SMS alerts to actually ship:
- Twilio account + 10DLC registration
- A `lib/notifications/sms.ts` helper wrapping Twilio's Node SDK
- A per-tenant `owner_phone` field on the business record (currently `DEFAULT_BUSINESS_ID = 'default'` — no multi-tenant model yet)
- An ACK reply parser (inbound webhook → mark alert acknowledged)
- A `notifications` table to track sent alerts, delivery status, ACK time

These are implementation details for a separate design doc, not pricing.

---

## 7. Open assumptions to validate

1. **One shared sender number is OK.** Some businesses want their AI agent to text *from the business's own number* so customers can reply. That's a separate use case (customer-facing SMS), not the owner-alert use case this doc covers. For owner alerts, shared is fine.
2. **No MMS.** We assume text-only alerts. If we want to include a screenshot or audio waveform, MMS pricing is ~6× higher per message ($0.020 vs $0.0083 base) — still cheap, but worth noting.
3. **Carrier surcharges drift.** T-Mobile bumped its surcharge in January 2026 (per Twilio's notice). Build a quarterly review reminder.
4. **Compliance content rules.** A2P 10DLC requires opt-in language and STOP-keyword handling. The owner technically "opts in" by configuring their phone in our dashboard, but we should add an explicit checkbox: *"I agree to receive emergency SMS alerts at this number. Reply STOP to opt out."*

---

## 8. Sources

- Twilio US SMS pricing: https://www.twilio.com/en-us/sms/pricing/us
- Twilio A2P 10DLC fees: https://help.twilio.com/articles/1260803965530-What-pricing-and-fees-are-associated-with-the-A2P-10DLC-service-
- Twilio international SMS pricing: https://www.twilio.com/en-us/sms/pricing
- Twilio WhatsApp pricing: https://www.twilio.com/en-us/whatsapp/pricing/us
