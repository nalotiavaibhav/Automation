import type {
  CrmContact,
  CrmDeal,
  CrmCallLog,
  CrmAppointment,
  CrmResult,
  CrmConnectionStatus,
  CrmOAuthTokens,
} from '@/types/crm';
import { BaseCrmAdapter } from '../base-adapter';
import { registerCrmAdapter } from '../registry';
import { tokenStore } from '../token-store';

// ---------------------------------------------------------------------------
// ServiceTitan API error helper
// ---------------------------------------------------------------------------
class ServiceTitanApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ServiceTitanApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// ServiceTitan Adapter
// ---------------------------------------------------------------------------
export class ServiceTitanAdapter extends BaseCrmAdapter {
  readonly provider = 'servicetitan' as const;
  private baseUrl: string;
  private authUrl: string;
  private tenantId: string;
  private appKey: string;
  private clientId: string;
  private clientSecret: string;

  constructor(tokens: CrmOAuthTokens) {
    // ServiceTitan rate limit: ~60 requests per second
    super({ maxRequestsPerWindow: 60, windowMs: 1_000 });
    this.setTokens(tokens);

    this.tenantId = tokens.tenantId || process.env.SERVICETITAN_TENANT_ID || '';
    this.appKey = tokens.appKey || process.env.SERVICETITAN_APP_KEY || '';
    this.clientId = process.env.SERVICETITAN_CLIENT_ID || '';
    this.clientSecret = process.env.SERVICETITAN_CLIENT_SECRET || '';

    const isSandbox = process.env.SERVICETITAN_ENV === 'sandbox';
    this.baseUrl = isSandbox
      ? 'https://api-integration.servicetitan.io'
      : 'https://api.servicetitan.io';
    this.authUrl = isSandbox
      ? 'https://auth-integration.servicetitan.io/connect/token'
      : 'https://auth.servicetitan.io/connect/token';
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Authenticated fetch wrapper for ServiceTitan API calls.
   *
   * - Prepends `baseUrl` to `path`
   * - Ensures the token is valid (re-authenticates if needed)
   * - Attaches `Authorization`, `ST-App-Key`, and `Content-Type` headers
   * - Wrapped in `makeRequest()` for rate limiting + retry
   */
  private async fetchST<T = unknown>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    return this.makeRequest(async () => {
      const accessToken = await this.ensureValidToken();

      const url = `${this.baseUrl}${path}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'ST-App-Key': this.appKey,
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ServiceTitanApiError(
          `ServiceTitan API error ${response.status}: ${body}`,
          response.status,
        );
      }

      // Some endpoints return 204 No Content
      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    });
  }

  // -----------------------------------------------------------------------
  // CRM operations
  // -----------------------------------------------------------------------

  /**
   * Create a customer in ServiceTitan.
   *
   * Entity chain: Customer -> Location -> Job
   * 1. Create the customer record
   * 2. Optionally create a location if address details are provided
   */
  async createContact(data: CrmContact): Promise<CrmResult> {
    try {
      // 1. Build the customer payload
      const customerBody: Record<string, unknown> = {
        name: `${data.firstName} ${data.lastName}`.trim(),
        type: 'Residential',
      };

      if (data.phone) {
        customerBody.phones = [{ number: data.phone }];
      }

      if (data.email) {
        customerBody.emails = [{ address: data.email }];
      }

      // Create customer
      const customer = await this.fetchST<{ id: number }>(
        `/crm/v2/tenant/${this.tenantId}/customers`,
        {
          method: 'POST',
          body: JSON.stringify(customerBody),
        },
      );

      const customerId = String(customer.id);

      // 2. Create a location if address is provided
      if (data.address) {
        const locationBody: Record<string, unknown> = {
          customerId: customer.id,
          name: 'Primary',
          address: {
            street: data.address,
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            country: 'US',
          },
        };

        await this.fetchST(
          `/crm/v2/tenant/${this.tenantId}/locations`,
          {
            method: 'POST',
            body: JSON.stringify(locationBody),
          },
        );
      }

      return {
        success: true,
        externalId: customerId,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create ServiceTitan customer',
      };
    }
  }

  /**
   * Create a job in ServiceTitan (equivalent of a "deal").
   *
   * ServiceTitan jobs link to a customer and (optionally) a location.
   * Creating a job auto-creates the first appointment.
   */
  async createDeal(data: CrmDeal): Promise<CrmResult> {
    try {
      // Map urgency to ServiceTitan priority
      const priorityMap: Record<string, string> = {
        routine: 'Normal',
        urgent: 'Urgent',
        emergency: 'Emergency',
      };

      const jobBody: Record<string, unknown> = {
        customerId: Number(data.externalContactId),
        summary: data.title,
        priority: priorityMap[data.urgency || 'routine'] || 'Normal',
      };

      if (data.description) {
        jobBody.summary = `${data.title} - ${data.description}`;
      }

      // Use a default job type ID (configurable per tenant)
      const defaultJobTypeId = process.env.SERVICETITAN_DEFAULT_JOB_TYPE_ID;
      if (defaultJobTypeId) {
        jobBody.jobTypeId = Number(defaultJobTypeId);
      }

      const job = await this.fetchST<{ id: number }>(
        `/jpm/v2/tenant/${this.tenantId}/jobs`,
        {
          method: 'POST',
          body: JSON.stringify(jobBody),
        },
      );

      return {
        success: true,
        externalId: String(job.id),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create ServiceTitan job',
      };
    }
  }

  /**
   * Log a call in ServiceTitan.
   *
   * ServiceTitan calls are typically created by the integrated phone system,
   * not via the API. We return a success result indicating that call logging
   * is passive in ServiceTitan.
   */
  async logCall(_data: CrmCallLog): Promise<CrmResult> {
    // ServiceTitan's telecom API is read-heavy — calls are created by the
    // phone system integration (e.g., ServiceTitan Phones or a VoIP
    // provider). External call creation is not supported via the public API.
    return {
      success: true,
      externalId: undefined,
      rawResponse: {
        note: 'ServiceTitan call logging is passive. Calls are recorded by the integrated phone system. Call data has been acknowledged.',
      },
    };
  }

  /**
   * Book an appointment in ServiceTitan.
   *
   * Appointments are typically created as part of job creation, but this
   * allows standalone appointment booking via the dispatch API.
   */
  async bookAppointment(data: CrmAppointment): Promise<CrmResult> {
    try {
      const appointmentBody: Record<string, unknown> = {
        customerId: Number(data.externalContactId),
        start: data.startTime,
        end: data.endTime,
        summary: data.title,
      };

      if (data.description) {
        appointmentBody.description = data.description;
      }

      const appointment = await this.fetchST<{ id: number }>(
        `/dispatch/v2/tenant/${this.tenantId}/appointments`,
        {
          method: 'POST',
          body: JSON.stringify(appointmentBody),
        },
      );

      return {
        success: true,
        externalId: String(appointment.id),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to book ServiceTitan appointment',
      };
    }
  }

  // -----------------------------------------------------------------------
  // Connection management
  // -----------------------------------------------------------------------

  /**
   * Check the connection status by making a lightweight API call.
   */
  async getConnectionStatus(): Promise<CrmConnectionStatus> {
    try {
      await this.fetchST(
        `/crm/v2/tenant/${this.tenantId}/customers?page=1&pageSize=1`,
      );

      return {
        provider: 'servicetitan',
        connected: true,
        accountName: `ServiceTitan (Tenant ${this.tenantId})`,
      };
    } catch (error) {
      return {
        provider: 'servicetitan',
        connected: false,
        error:
          error instanceof Error ? error.message : 'Connection check failed',
      };
    }
  }

  /**
   * Disconnect by clearing stored tokens.
   */
  async disconnect(): Promise<void> {
    this.tokens = null;
    // Also remove from the token store (using a default business ID)
    await tokenStore.deleteTokens('default', 'servicetitan');
  }

  // -----------------------------------------------------------------------
  // OAuth / Auth
  // -----------------------------------------------------------------------

  /**
   * ServiceTitan uses client credentials (machine-to-machine) — there is no
   * user-facing authorization URL.
   */
  getAuthorizationUrl(_redirectUri: string, _state: string): string {
    // Not applicable for client credentials flow
    return '';
  }

  /**
   * Not applicable for client credentials flow.
   */
  async handleOAuthCallback(
    _code: string,
    _redirectUri: string,
  ): Promise<CrmOAuthTokens> {
    throw new Error(
      'ServiceTitan uses client credentials flow. OAuth callback is not applicable.',
    );
  }

  /**
   * Re-authenticate using client credentials.
   *
   * ServiceTitan tokens expire in 900 seconds (15 min) and there are no
   * refresh tokens — we simply request a new access token.
   */
  async refreshTokens(tokens: CrmOAuthTokens): Promise<CrmOAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `ServiceTitan token refresh failed (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    const newTokens: CrmOAuthTokens = {
      provider: 'servicetitan',
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1_000,
      tenantId: tokens.tenantId || this.tenantId,
      appKey: tokens.appKey || this.appKey,
    };

    // Persist refreshed tokens
    await tokenStore.saveTokens('default', newTokens);

    return newTokens;
  }
}

// ---------------------------------------------------------------------------
// Register the adapter in the CRM registry
// ---------------------------------------------------------------------------
registerCrmAdapter(
  'servicetitan',
  (tokens: CrmOAuthTokens) => new ServiceTitanAdapter(tokens),
);
