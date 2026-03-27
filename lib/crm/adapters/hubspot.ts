import { Client } from '@hubspot/api-client';
import { BaseCrmAdapter } from '../base-adapter';
import type {
  CrmContact,
  CrmDeal,
  CrmCallLog,
  CrmAppointment,
  CrmResult,
  CrmConnectionStatus,
  CrmOAuthTokens,
} from '@/types/crm';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || '';
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || '';

const HUBSPOT_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.objects.calls.read',
  'crm.objects.calls.write',
  'crm.objects.meetings.read',
  'crm.objects.meetings.write',
];

export class HubSpotAdapter extends BaseCrmAdapter {
  readonly provider = 'hubspot' as const;
  private client: Client;

  constructor(tokens: CrmOAuthTokens) {
    super({ maxRequestsPerWindow: 100, windowMs: 10_000 });
    this.setTokens(tokens);
    this.client = new Client({ accessToken: tokens.accessToken });
  }

  private updateClient(accessToken: string): void {
    this.client = new Client({ accessToken });
  }

  // ── Contacts ──────────────────────────────────────────────────────────

  async createContact(data: CrmContact): Promise<CrmResult> {
    return this.makeRequest(async () => {
      const accessToken = await this.ensureValidToken();
      this.updateClient(accessToken);

      const properties: Record<string, string> = {
        firstname: data.firstName,
        lastname: data.lastName,
        phone: data.phone,
        lifecyclestage: 'lead',
      };

      if (data.email) properties.email = data.email;
      if (data.address) properties.address = data.address;
      if (data.city) properties.city = data.city;
      if (data.state) properties.state = data.state;
      if (data.zip) properties.zip = data.zip;

      const response = await this.client.crm.contacts.basicApi.create({
        properties,
        associations: [],
      });

      return { success: true, externalId: response.id };
    });
  }

  // ── Deals ─────────────────────────────────────────────────────────────

  async createDeal(data: CrmDeal): Promise<CrmResult> {
    return this.makeRequest(async () => {
      const accessToken = await this.ensureValidToken();
      this.updateClient(accessToken);

      const properties: Record<string, string> = {
        dealname: data.title,
        dealstage: data.stage || 'appointmentscheduled',
        pipeline: 'default',
      };

      if (data.estimatedValue !== undefined) {
        properties.amount = String(data.estimatedValue);
      }
      if (data.description) properties.description = data.description;

      const response = await this.client.crm.deals.basicApi.create({
        properties,
        associations: [],
      });

      // Associate the deal with the contact via the v4 associations API
      if (data.externalContactId) {
        await this.client.crm.associations.v4.basicApi.createDefault(
          'deals',
          response.id,
          'contacts',
          data.externalContactId,
        );
      }

      return { success: true, externalId: response.id };
    });
  }

  // ── Call Logging ──────────────────────────────────────────────────────

  async logCall(data: CrmCallLog): Promise<CrmResult> {
    return this.makeRequest(async () => {
      const accessToken = await this.ensureValidToken();
      this.updateClient(accessToken);

      const timestampMs = String(new Date(data.timestamp).getTime());
      const durationMs = String(data.duration * 1_000); // duration in seconds -> ms

      const properties: Record<string, string> = {
        hs_timestamp: timestampMs,
        hs_call_title: 'AI Receptionist Call',
        hs_call_duration: durationMs,
        hs_call_status: 'COMPLETED',
        hs_call_direction: data.direction === 'inbound' ? 'INBOUND' : 'OUTBOUND',
      };

      if (data.transcript) {
        properties.hs_call_body = data.transcript;
      } else if (data.summary) {
        properties.hs_call_body = data.summary;
      }
      if (data.recordingUrl) {
        properties.hs_call_recording_url = data.recordingUrl;
      }

      const response = await this.client.crm.objects.calls.basicApi.create({
        properties,
        associations: [],
      });

      // Associate the call with the contact via the v4 associations API
      if (data.externalContactId) {
        await this.client.crm.associations.v4.basicApi.createDefault(
          'calls',
          response.id,
          'contacts',
          data.externalContactId,
        );
      }

      return { success: true, externalId: response.id };
    });
  }

  // ── Appointments / Meetings ───────────────────────────────────────────

  async bookAppointment(data: CrmAppointment): Promise<CrmResult> {
    return this.makeRequest(async () => {
      const accessToken = await this.ensureValidToken();
      this.updateClient(accessToken);

      const startMs = String(new Date(data.startTime).getTime());
      const endMs = String(new Date(data.endTime).getTime());

      const properties: Record<string, string> = {
        hs_meeting_title: data.title,
        hs_meeting_start_time: startMs,
        hs_meeting_end_time: endMs,
        hs_meeting_outcome: 'SCHEDULED',
        hs_timestamp: startMs,
      };

      if (data.description) properties.hs_meeting_body = data.description;
      if (data.location) properties.hs_meeting_location = data.location;

      const response = await this.client.crm.objects.meetings.basicApi.create({
        properties,
        associations: [],
      });

      // Associate the meeting with the contact via the v4 associations API
      if (data.externalContactId) {
        await this.client.crm.associations.v4.basicApi.createDefault(
          'meetings',
          response.id,
          'contacts',
          data.externalContactId,
        );
      }

      return { success: true, externalId: response.id };
    });
  }

  // ── Connection Status ─────────────────────────────────────────────────

  async getConnectionStatus(): Promise<CrmConnectionStatus> {
    try {
      const accessToken = await this.ensureValidToken();
      this.updateClient(accessToken);

      // Fetch a single contact to verify the connection is alive
      await this.client.crm.contacts.basicApi.getPage(1);

      return {
        provider: 'hubspot',
        connected: true,
        lastSyncAt: new Date().toISOString(),
      };
    } catch {
      return {
        provider: 'hubspot',
        connected: false,
        error: 'Unable to connect to HubSpot',
      };
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    this.tokens = null;
  }

  // ── OAuth: Authorization URL ──────────────────────────────────────────

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: HUBSPOT_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: HUBSPOT_SCOPES.join(' '),
      state,
    });

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  // ── OAuth: Token Exchange ─────────────────────────────────────────────

  async handleOAuthCallback(
    code: string,
    redirectUri: string,
  ): Promise<CrmOAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HubSpot token exchange failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const tokens: CrmOAuthTokens = {
      provider: 'hubspot',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1_000,
      scopes: HUBSPOT_SCOPES,
    };

    // Update the local client with the new access token
    this.setTokens(tokens);
    this.updateClient(tokens.accessToken);

    return tokens;
  }

  // ── OAuth: Token Refresh ──────────────────────────────────────────────

  async refreshTokens(tokens: CrmOAuthTokens): Promise<CrmOAuthTokens> {
    if (!tokens.refreshToken) {
      throw new Error('No refresh token available for HubSpot');
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
    });

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HubSpot token refresh failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const refreshed: CrmOAuthTokens = {
      provider: 'hubspot',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1_000,
      scopes: HUBSPOT_SCOPES,
    };

    // Keep the local client in sync
    this.updateClient(refreshed.accessToken);

    return refreshed;
  }
}
