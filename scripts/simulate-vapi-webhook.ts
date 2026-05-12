/**
 * Vapi webhook simulator — POSTs a realistic `end-of-call-report` payload
 * at your running `next dev` server. Exercises the FULL pipeline:
 *
 *   webhook → vapi-extractor → sync-orchestrator → SMS dispatch + CRM sync
 *
 * Lets you test without placing a real phone call.
 *
 *   # In one terminal:
 *   npm run dev
 *
 *   # In another:
 *   npm run test:webhook                       # routine call (no SMS)
 *   npm run test:webhook -- --emergency        # emergency call (SMS fires)
 *   npm run test:webhook -- --url https://...  # against deployed env
 */
import 'dotenv/config';
import { banner, c, sym } from './_lib';

interface Args {
  url: string;
  emergency: boolean;
  bookingMade: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    url: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/vapi`
      : 'http://localhost:3000/api/webhooks/vapi',
    emergency: false,
    bookingMade: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--emergency') args.emergency = true;
    else if (a === '--no-booking') args.bookingMade = false;
    else if (a === '--url') args.url = argv[++i] ?? args.url;
  }
  return args;
}

function buildPayload(args: Args): unknown {
  const callId = `flowmax-test-${Date.now()}`;
  const now = new Date();
  const endedAt = now.toISOString();
  const startedAt = new Date(now.getTime() - 90_000).toISOString();
  const appointmentStart = new Date(now.getTime() + 3 * 60 * 60 * 1_000).toISOString();
  const appointmentEnd = new Date(now.getTime() + 4 * 60 * 60 * 1_000).toISOString();

  const transcript = args.emergency
    ? [
        { role: 'assistant', message: 'Thanks for calling Flowmax Plumbing, how can I help?' },
        { role: 'user', message: 'I have a burst pipe spraying water everywhere in my basement!' },
        { role: 'assistant', message: 'I am dispatching an emergency tech right now. What is your address?' },
        { role: 'user', message: '123 Test Street, Springfield Illinois 62701.' },
        { role: 'assistant', message: 'Got it. A technician will be there within 30 minutes.' },
      ]
    : [
        { role: 'assistant', message: 'Thanks for calling Flowmax Plumbing, how can I help?' },
        { role: 'user', message: 'I need someone to look at a slow drain in my kitchen sink.' },
        { role: 'assistant', message: 'No problem. We have an opening tomorrow at 2 PM. Does that work?' },
        { role: 'user', message: 'Yes, that works great.' },
        { role: 'assistant', message: 'Booked. We will see you tomorrow at 2.' },
      ];

  const summary = args.emergency
    ? 'Caller reported burst pipe, basement flooding. Emergency tech dispatched.'
    : 'Customer booked a slow-drain inspection for tomorrow at 2 PM.';

  return {
    message: {
      type: 'end-of-call-report',
      call: {
        id: callId,
        assistantId: 'asst_smoke_test',
        customer: { number: '+15550199123456' },
        startedAt,
        endedAt,
        artifact: {
          messages: transcript,
          recordingUrl: 'https://example.com/recordings/flowmax-test.wav',
          stereoRecordingUrl: 'https://example.com/recordings/flowmax-test-stereo.wav',
        },
        analysis: {
          summary,
          structuredData: {
            customerFirstName: 'Pat',
            customerLastName: 'TestCaller',
            serviceType: args.emergency ? 'Emergency Plumbing' : 'Drain Cleaning',
            urgency: args.emergency ? 'emergency' : 'routine',
            serviceAddress: '123 Test St, Springfield IL 62701',
            bookingMade: args.bookingMade,
            appointmentStart: args.bookingMade ? appointmentStart : undefined,
            appointmentEnd: args.bookingMade ? appointmentEnd : undefined,
          },
        },
      },
    },
  };
}

async function main(): Promise<void> {
  banner('Vapi Webhook Simulator');

  const args = parseArgs(process.argv.slice(2));
  const payload = buildPayload(args);

  console.log(`  ${sym.info} target  ${c.cyan}${args.url}${c.reset}`);
  console.log(`  ${sym.info} flavor  ${args.emergency ? c.red + 'EMERGENCY' : c.green + 'routine'}${c.reset}`);
  console.log(`  ${sym.info} booking ${args.bookingMade ? 'yes' : 'no'}\n`);

  const start = Date.now();
  let res: Response;
  try {
    res = await fetch(args.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.log(`  ${sym.fail} ${c.red}Could not reach ${args.url}${c.reset}`);
    console.log(`  ${c.gray}${err instanceof Error ? err.message : String(err)}${c.reset}`);
    console.log(
      `\n  ${c.yellow}Tip:${c.reset} make sure ${c.cyan}npm run dev${c.reset} is running in another terminal.\n`,
    );
    process.exit(1);
  }
  const elapsedMs = Date.now() - start;

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* not JSON */
  }

  if (!res.ok) {
    console.log(`  ${sym.fail} ${c.red}HTTP ${res.status}${c.reset} ${c.gray}(${elapsedMs}ms)${c.reset}`);
    console.log(`     body: ${text.slice(0, 500)}`);
    process.exit(1);
  }

  console.log(`  ${sym.pass} ${c.green}HTTP ${res.status}${c.reset} ${c.gray}(${elapsedMs}ms)${c.reset}`);
  console.log(`     body: ${JSON.stringify(parsed ?? text)}`);

  console.log(`\n${c.bold}Expected side effects${c.reset}`);
  console.log(`  ${c.gray}─${c.reset}`);
  console.log(`  ${sym.arrow} new ${c.cyan}Call${c.reset} record appears at ${c.cyan}/dashboard${c.reset}`);
  console.log(`  ${sym.arrow} CRM (if configured): contact + deal + call log + meeting created`);
  if (args.emergency) {
    console.log(
      `  ${sym.arrow} ${c.red}SMS sent${c.reset} to ${c.cyan}OWNER_ALERT_PHONE${c.reset} (within ~5s)`,
    );
    console.log(
      `  ${sym.arrow} call-detail-sheet → "Owner Alert" section shows delivery status`,
    );
  } else {
    console.log(`  ${sym.arrow} ${c.gray}no SMS (routine urgency)${c.reset}`);
  }
  console.log(
    `\n  ${c.gray}Check the ${c.cyan}next dev${c.gray} terminal for orchestrator + SMS log lines.${c.reset}\n`,
  );
}

main().catch((err) => {
  console.error(`${c.red}Unexpected simulator error:${c.reset}`, err);
  process.exit(1);
});
