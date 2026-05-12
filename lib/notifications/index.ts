import { sendEmergencySms } from './sms';

export type NotificationPayload =
  | {
      type: 'new_call_processed';
      customerPhone?: string;
      summary?: string;
      crmProvider?: string;
      crmContactId?: string;
    }
  | {
      type: 'crm_sync_failed';
      crmProvider?: string;
      error?: string;
    }
  | {
      type: 'appointment_booked';
      customerPhone?: string;
      summary?: string;
      crmProvider?: string;
      crmContactId?: string;
    }
  | {
      type: 'emergency_call';
      callId: string;
      customerPhone: string;
      summary: string;
      endedAt: string;
      deepLink: string;
    };

export async function sendBusinessNotification(
  businessId: string,
  data: NotificationPayload
): Promise<void> {
  if (data.type === 'emergency_call') {
    const result = await sendEmergencySms({
      callId: data.callId,
      customerPhone: data.customerPhone,
      summary: data.summary,
      endedAt: data.endedAt,
      deepLink: data.deepLink,
    });
    console.log(
      `[Flowmax Notification] emergency_call business=${businessId} call=${data.callId} success=${result.success} sid=${result.sid ?? '-'}`
    );
    return;
  }

  console.log(
    `[Flowmax Notification] Business ${businessId}:`,
    JSON.stringify(data, null, 2)
  );
  // TODO Phase 2: Email via Resend for non-emergency types
}

export { sendEmergencySms } from './sms';
export type { SmsResult, EmergencySmsArgs } from './sms';
