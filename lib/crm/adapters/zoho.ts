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

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';

const ZOHO_SCOPES = [
  'ZohoCRM.modules.contacts.ALL',
  'ZohoCRM.modules.deals.ALL',
  'ZohoCRM.modules.activities.ALL',
  'ZohoCRM.modules.events.ALL',
  'ZohoCRM.settings.ALL',
];

const ZOHO_STAGE_MAP: Record<string, string> = {
  new: 'Qualification',
  contacted: 'Needs Analysis',
  qualified: 'Value Proposition',
  booked: 'Proposal/Price Quote',
  completed: 'Closed Won',
  qualification: 'Qualification',
  'needs analysis': 'Needs Analysis',
  'closed won': 'Closed Won',
  'closed lost': 'Closed Lost',
};

interface ZohoResponse {
  data: Array<{
    code: string;
    details: { id: string };
    message: string;
    status: string;
  }>;
}

export class ZohoAdapter extends BaseCrmAdapter {
  readonly provider = 'zoho' as const;
  private baseUrl: string;

  constructor(tokens: CrmOAuthTokens) {
    super({ maxRequestsPerWindow: 100, windowMs: 60_000 });
    this.setTokens(tokens);
    this.baseUrl =
      tokens.tenantId ||
      process.env.ZOHO_API_DOMAIN ||
      'https://www.zohoapis.com';
  }

  // ── Private Helper ────────────────────────────────────────────────────

  private async fetchZoho<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    return this.makeRequest(async () => {
      const accessToken = await this.ensureValidToken();
      const url = `${this.baseUrl}/crm/v6${path}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
          ...(options?.headers as Record<string, string>),
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error: Error & { status?: number } = new Error(
          `Zoho API error (${response.status}): ${text}`,
        );
        (error as any).status = response.status;
        throw error;
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    });
  }

  // ── Contacts ──────────────────────────────────────────────────────────

  async createContact(data: CrmContact): Promise<CrmResult> {
    const payload: Record<string, unknown> = {
      First_Name: data.firstName,
      Last_Name: data.lastName,
      Phone: data.phone,
    };

    if (data.email) payload.Email = data.email;
    if (data.address) payload.Mailing_Street = data.address;
    if (data.city) payload.Mailing_City = data.city;
    if (data.state) payload.Mailing_State = data.state;
    if (data.zip) payload.Mailing_Zip = data.zip;
    if (data.source) payload.Lead_Source = data.source;
    if (data.notes) payload.Description = data.notes;

    const result = await this.fetchZoho<ZohoResponse>('/Contacts', {
      method: 'POST',
      body: JSON.stringify({ data: [payload] }),
    });

    if (result.data[0].code === 'SUCCESS') {
      return { success: true, externalId: result.data[0].details.id };
    }

    return { success: false, error: result.data[0].message };
  }

  // ── Deals ─────────────────────────────────────────────────────────────

  async createDeal(data: CrmDeal): Promise<CrmResult> {
    const payload: Record<string, unknown> = {
      Deal_Name: data.title,
      Stage: ZOHO_STAGE_MAP[data.stage || ''] || 'Qualification',
    };

    if (data.estimatedValue !== undefined) payload.Amount = data.estimatedValue;
    if (data.description) payload.Description = data.description;
    if (data.externalContactId) {
      payload.Contact_Name = { id: data.externalContactId };
    }

    const result = await this.fetchZoho<ZohoResponse>('/Deals', {
      method: 'POST',
      body: JSON.stringify({ data: [payload] }),
    });

    if (result.data[0].code === 'SUCCESS') {
      return { success: true, externalId: result.data[0].details.id };
    }

    return { success: false, error: result.data[0].message };
  }

  // ── Call Logging ──────────────────────────────────────────────────────

  async logCall(data: CrmCallLog): Promise<CrmResult> {
    const mins = Math.floor(data.duration / 60);
    const secs = data.duration % 60;
    const duration = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const payload: Record<string, unknown> = {
      Subject: 'AI Receptionist Call',
      Call_Duration: duration,
      Call_Start_Time: new Date(data.timestamp).toISOString(),
      Call_Type: data.direction === 'inbound' ? 'Inbound' : 'Outbound',
    };

    if (data.transcript) {
      payload.Description = data.transcript;
    } else if (data.summary) {
      payload.Description = data.summary;
    }

    if (data.externalContactId) {
      payload.Who_Id = { id: data.externalContactId };
    }

    const result = await this.fetchZoho<ZohoResponse>('/Calls', {
      method: 'POST',
      body: JSON.stringify({ data: [payload] }),
    });

    if (result.data[0].code === 'SUCCESS') {
      return { success: true, externalId: result.data[0].details.id };
    }

    return { success: false, error: result.data[0].message };
  }

  // ── Appointments / Events ─────────────────────────────────────────────

  async bookAppointment(data: CrmAppointment): Promise<CrmResult> {
    const payload: Record<string, unknown> = {
      Event_Title: data.title,
      Start_DateTime: new Date(data.startTime).toISOString(),
      End_DateTime: new Date(data.endTime).toISOString(),
    };

    if (data.location) payload.Location = data.location;
    if (data.description) payload.Description = data.description;
    if (data.externalContactId) {
      payload.Who_Id = { id: data.externalContactId };
    }

    const result = await this.fetchZoho<ZohoResponse>('/Events', {
      method: 'POST',
      body: JSON.stringify({ data: [payload] }),
    });

    if (result.data[0].code === 'SUCCESS') {
      return { success: true, externalId: result.data[0].details.id };
    }

    return { success: false, error: result.data[0].message };
  }

  // ── Connection Status ─────────────────────────────────────────────────

  async getConnectionStatus(): Promise<CrmConnectionStatus> {
    try {
      await this.fetchZoho('/Contacts?per_page=1');

      return {
        provider: 'zoho',
        connected: true,
        lastSyncAt: new Date().toISOString(),
      };
    } catch {
      return {
        provider: 'zoho',
        connected: false,
        error: 'Unable to connect to Zoho CRM',
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
      response_type: 'code',
      client_id: ZOHO_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: ZOHO_SCOPES.join(','),
      access_type: 'offline',
      state,
    });

    return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
  }

  // ── OAuth: Token Exchange ─────────────────────────────────────────────

  async handleOAuthCallback(
    code: string,
    redirectUri: string,
  ): Promise<CrmOAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Zoho token exchange failed (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      api_domain: string;
    };

    const tokens: CrmOAuthTokens = {
      provider: 'zoho',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1_000,
      scopes: ZOHO_SCOPES,
      tenantId: data.api_domain,
    };

    this.setTokens(tokens);
    this.baseUrl = data.api_domain;

    return tokens;
  }

  // ── OAuth: Token Refresh ──────────────────────────────────────────────

  async refreshTokens(tokens: CrmOAuthTokens): Promise<CrmOAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken!,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
    });

    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Zoho token refresh failed (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      api_domain?: string;
    };

    const refreshed: CrmOAuthTokens = {
      provider: 'zoho',
      accessToken: data.access_token,
      refreshToken: tokens.refreshToken, // Zoho does not return a new refresh token
      expiresAt: Date.now() + data.expires_in * 1_000,
      scopes: ZOHO_SCOPES,
      tenantId: data.api_domain || tokens.tenantId,
    };

    if (data.api_domain) {
      this.baseUrl = data.api_domain;
    }

    return refreshed;
  }
}
