export interface NotificationPayload {
  type: 'new_call_processed' | 'crm_sync_failed' | 'appointment_booked';
  customerPhone?: string;
  summary?: string;
  crmProvider?: string;
  crmContactId?: string;
  error?: string;
}

export async function sendBusinessNotification(
  businessId: string,
  data: NotificationPayload
): Promise<void> {
  // Phase 1: Console log
  console.log(
    `[Flowmax Notification] Business ${businessId}:`,
    JSON.stringify(data, null, 2)
  );
  // TODO Phase 2: Email via Resend
  // TODO Phase 3: SMS via Telnyx
}
