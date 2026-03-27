export interface VapiCallData {
  callId: string;
  assistantId: string;
  customerPhone: string;
  customerFirstName?: string;
  customerLastName?: string;
  serviceType?: string;
  urgency?: 'routine' | 'urgent' | 'emergency';
  transcript: string;
  summary: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  durationSeconds: number;
  bookingMade: boolean;
  appointmentStart?: string;
  appointmentEnd?: string;
  serviceAddress?: string;
  endedAt: string;
}

/**
 * Extracts structured call data from a Vapi end-of-call-report webhook payload.
 * Returns null if the payload is missing critical data.
 */
export function extractVapiCallData(payload: Record<string, unknown>): VapiCallData | null {
  const message = payload.message as Record<string, unknown> | undefined;
  if (!message) return null;

  // The call object is nested inside message
  const call = (message.call ?? message) as Record<string, unknown>;
  if (!call) return null;

  // --- Call metadata ---
  const callId = (call.id ?? message.callId ?? '') as string;
  const assistantId = ((call.assistantId ?? message.assistantId) as string) || '';

  if (!callId) return null;

  // --- Customer phone ---
  const customer = (call.customer ?? {}) as Record<string, unknown>;
  const customerPhone = (customer.number as string) || '';

  // --- Timestamps & duration ---
  const startedAt = (call.startedAt as string) || '';
  const endedAt = (call.endedAt as string) || (message.endedAt as string) || '';
  let durationSeconds = 0;
  if (startedAt && endedAt) {
    durationSeconds = Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    );
  }

  // --- Transcript ---
  const artifact = (call.artifact ?? message.artifact ?? {}) as Record<string, unknown>;
  const messages = (artifact.messages ?? call.messages ?? message.messages ?? []) as Array<
    Record<string, unknown>
  >;

  const transcript = messages
    .filter(
      (m) =>
        ['assistant', 'bot', 'user'].includes(m.role as string) &&
        ((m.message as string) || (m.content as string))
    )
    .map((m) => {
      const role = (m.role as string) === 'user' ? 'Customer' : 'AI';
      const text = (m.message as string) || (m.content as string) || '';
      return `${role}: ${text}`;
    })
    .join('\n');

  // --- Summary ---
  const analysis = (call.analysis ?? message.analysis ?? {}) as Record<string, unknown>;
  const summary = (analysis.summary as string) || '';

  // --- Recording URLs ---
  const recordingUrl = (artifact.recordingUrl as string) || (call.recordingUrl as string) || undefined;
  const stereoRecordingUrl =
    (artifact.stereoRecordingUrl as string) || (call.stereoRecordingUrl as string) || undefined;

  // --- Tool call results: look for booking details and customer info ---
  const toolCalls = extractToolCallResults(messages);

  const bookingResult = toolCalls.find(
    (tc) =>
      tc.name === 'bookAppointment' ||
      tc.name === 'book_appointment' ||
      tc.name === 'scheduleAppointment' ||
      tc.name === 'schedule_appointment'
  );
  const bookingMade = bookingResult?.result?.success === true;

  // Try to extract customer name from tool calls (e.g. createContact)
  const contactToolCall = toolCalls.find(
    (tc) =>
      tc.name === 'createContact' ||
      tc.name === 'create_contact' ||
      tc.name === 'collectCustomerInfo' ||
      tc.name === 'collect_customer_info'
  );

  let customerFirstName: string | undefined;
  let customerLastName: string | undefined;
  let serviceType: string | undefined;
  let urgency: VapiCallData['urgency'] | undefined;
  let serviceAddress: string | undefined;

  if (contactToolCall?.args) {
    customerFirstName = (contactToolCall.args.firstName as string) || undefined;
    customerLastName = (contactToolCall.args.lastName as string) || undefined;
    serviceAddress = (contactToolCall.args.address as string) || undefined;
  }

  // Also check for service info from tool calls
  const serviceToolCall = toolCalls.find(
    (tc) =>
      tc.name === 'identifyService' ||
      tc.name === 'identify_service' ||
      tc.name === 'classifyService' ||
      tc.name === 'classify_service'
  );
  if (serviceToolCall?.args) {
    serviceType = (serviceToolCall.args.serviceType as string) || undefined;
    urgency = (serviceToolCall.args.urgency as VapiCallData['urgency']) || undefined;
  }

  // Fall back: check structured data in analysis
  const structuredData = (analysis.structuredData ?? {}) as Record<string, unknown>;
  if (!customerFirstName && structuredData.firstName) {
    customerFirstName = structuredData.firstName as string;
  }
  if (!customerLastName && structuredData.lastName) {
    customerLastName = structuredData.lastName as string;
  }
  if (!serviceType && structuredData.serviceType) {
    serviceType = structuredData.serviceType as string;
  }
  if (!urgency && structuredData.urgency) {
    urgency = structuredData.urgency as VapiCallData['urgency'];
  }
  if (!serviceAddress && structuredData.address) {
    serviceAddress = structuredData.address as string;
  }

  return {
    callId,
    assistantId,
    customerPhone,
    customerFirstName,
    customerLastName,
    serviceType,
    urgency,
    transcript,
    summary,
    recordingUrl,
    stereoRecordingUrl,
    durationSeconds,
    bookingMade,
    appointmentStart: bookingResult?.result?.startTime as string | undefined,
    appointmentEnd: bookingResult?.result?.endTime as string | undefined,
    serviceAddress,
    endedAt,
  };
}

// ---- Helpers ----

interface ExtractedToolCall {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

/**
 * Walks through Vapi messages to find tool-call results.
 * Vapi sends tool calls as role="tool_calls" and results as role="tool_call_result".
 */
function extractToolCallResults(
  messages: Array<Record<string, unknown>>
): ExtractedToolCall[] {
  const results: ExtractedToolCall[] = [];

  for (const msg of messages) {
    // Vapi uses "tool_calls" role or "function_call" in the message
    if (msg.role === 'tool_calls' || msg.role === 'tool_call_result') {
      const toolCallList = (msg.toolCalls ?? msg.tool_calls ?? []) as Array<
        Record<string, unknown>
      >;
      for (const tc of toolCallList) {
        const fn = (tc.function ?? tc) as Record<string, unknown>;
        const name = (fn.name as string) || '';
        let args: Record<string, unknown> = {};
        try {
          args =
            typeof fn.arguments === 'string'
              ? JSON.parse(fn.arguments as string)
              : (fn.arguments as Record<string, unknown>) ?? {};
        } catch {
          // ignore parse errors
        }

        let result: Record<string, unknown> = {};
        const rawResult = msg.results ?? msg.result ?? tc.result;
        if (rawResult) {
          try {
            result =
              typeof rawResult === 'string'
                ? JSON.parse(rawResult as string)
                : (rawResult as Record<string, unknown>) ?? {};
          } catch {
            // ignore parse errors
          }
        }

        if (name) {
          results.push({ name, args, result });
        }
      }
    }
  }

  return results;
}
