import { getCrmAdapter } from './registry';
import { tokenStore } from './token-store';
import { registerAllAdapters } from './adapters';
import { sendBusinessNotification } from '../notifications';
import type { VapiCallData } from './vapi-extractor';
import type { CrmProvider } from '@/types/crm';

interface BusinessCrmConfig {
  businessId: string;
  provider: CrmProvider;
}

/** Ensure adapters are registered exactly once */
let adaptersRegistered = false;
function ensureAdaptersRegistered() {
  if (!adaptersRegistered) {
    registerAllAdapters();
    adaptersRegistered = true;
  }
}

/**
 * Resolve the CRM config for a given business.
 * For now, falls back to the DEFAULT_CRM_PROVIDER env var.
 */
function getBusinessCrmConfig(businessId: string): BusinessCrmConfig | null {
  const provider = process.env.DEFAULT_CRM_PROVIDER as CrmProvider | undefined;
  if (!provider) return null;
  return { businessId, provider };
}

/**
 * Full CRM sync pipeline triggered after a Vapi call ends.
 * Steps:
 *  1. Resolve CRM provider for the business
 *  2. Retrieve stored OAuth tokens
 *  3. Create/update contact
 *  4. Log the call
 *  5. Create a deal (if a service was identified)
 *  6. Book an appointment (if one was scheduled)
 *  7. Send a notification to the business
 *
 * Each step is independent -- a failure in one does not block the others.
 */
export async function processCrmSync(
  businessId: string,
  callData: VapiCallData
): Promise<void> {
  ensureAdaptersRegistered();

  // 1. Get CRM config
  const config = getBusinessCrmConfig(businessId);
  if (!config) {
    console.log(`[CRM Sync] No CRM configured for business ${businessId}, skipping`);
    return;
  }

  console.log(
    `[CRM Sync] Starting sync for business ${businessId}, provider=${config.provider}, call=${callData.callId}`
  );

  // 2. Get tokens
  const tokens = await tokenStore.getTokens(businessId, config.provider);
  if (!tokens) {
    console.warn(
      `[CRM Sync] No tokens found for business ${businessId}, provider ${config.provider}`
    );
    await sendBusinessNotification(businessId, {
      type: 'crm_sync_failed',
      crmProvider: config.provider,
      error: `No CRM credentials found for ${config.provider}. Please reconnect.`,
    });
    return;
  }

  // 3. Create adapter
  const adapter = getCrmAdapter(config.provider, tokens);

  let contactExternalId: string | undefined;

  // 4. Create contact
  try {
    const contactResult = await adapter.createContact({
      firstName: callData.customerFirstName || 'Unknown',
      lastName: callData.customerLastName || '',
      phone: callData.customerPhone,
      address: callData.serviceAddress,
      source: 'Flowmax AI Receptionist',
      notes: `Auto-created from call ${callData.callId}`,
    });

    if (contactResult.success) {
      contactExternalId = contactResult.externalId;
      console.log(`[CRM Sync] Contact created: ${contactExternalId}`);
    } else {
      console.warn(`[CRM Sync] Contact creation failed: ${contactResult.error}`);
    }
  } catch (err) {
    console.error('[CRM Sync] Contact creation error:', err);
  }

  // 5. Log the call
  try {
    const callLogResult = await adapter.logCall({
      contactId: contactExternalId || '',
      externalContactId: contactExternalId || '',
      direction: 'inbound',
      duration: callData.durationSeconds,
      transcript: callData.transcript,
      summary: callData.summary,
      recordingUrl: callData.recordingUrl,
      outcome: callData.bookingMade ? 'Appointment Booked' : 'Information Provided',
      timestamp: callData.endedAt,
    });

    if (callLogResult.success) {
      console.log(`[CRM Sync] Call logged: ${callLogResult.externalId}`);
    } else {
      console.warn(`[CRM Sync] Call logging failed: ${callLogResult.error}`);
    }
  } catch (err) {
    console.error('[CRM Sync] Call logging error:', err);
  }

  // 6. Create deal (if service identified)
  if (callData.serviceType && contactExternalId) {
    try {
      const dealResult = await adapter.createDeal({
        title: `${callData.serviceType} - ${callData.customerFirstName || callData.customerPhone}`,
        contactId: contactExternalId,
        externalContactId: contactExternalId,
        description: callData.summary,
        serviceType: callData.serviceType,
        urgency: callData.urgency,
        stage: 'new',
      });

      if (dealResult.success) {
        console.log(`[CRM Sync] Deal created: ${dealResult.externalId}`);
      } else {
        console.warn(`[CRM Sync] Deal creation failed: ${dealResult.error}`);
      }
    } catch (err) {
      console.error('[CRM Sync] Deal creation error:', err);
    }
  }

  // 7. Book appointment (if scheduled during the call)
  if (callData.bookingMade && callData.appointmentStart && contactExternalId) {
    try {
      const appointmentResult = await adapter.bookAppointment({
        contactId: contactExternalId,
        externalContactId: contactExternalId,
        title: callData.serviceType
          ? `${callData.serviceType} Appointment`
          : 'Service Appointment',
        description: callData.summary,
        startTime: callData.appointmentStart,
        endTime: callData.appointmentEnd || callData.appointmentStart,
        location: callData.serviceAddress,
        serviceType: callData.serviceType,
      });

      if (appointmentResult.success) {
        console.log(`[CRM Sync] Appointment booked: ${appointmentResult.externalId}`);
        await sendBusinessNotification(businessId, {
          type: 'appointment_booked',
          customerPhone: callData.customerPhone,
          summary: callData.summary,
          crmProvider: config.provider,
          crmContactId: contactExternalId,
        });
      } else {
        console.warn(`[CRM Sync] Appointment booking failed: ${appointmentResult.error}`);
      }
    } catch (err) {
      console.error('[CRM Sync] Appointment booking error:', err);
    }
  }

  // 8. Send new-call notification
  await sendBusinessNotification(businessId, {
    type: 'new_call_processed',
    customerPhone: callData.customerPhone,
    summary: callData.summary,
    crmProvider: config.provider,
    crmContactId: contactExternalId,
  });

  console.log(`[CRM Sync] Sync complete for call ${callData.callId}`);
}
