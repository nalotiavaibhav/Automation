import { BaseCrmAdapter } from '../base-adapter';
import type {
  CrmContact,
  CrmDeal,
  CrmCallLog,
  CrmAppointment,
  CrmResult,
  CrmConnectionStatus,
  CrmProvider,
  CrmOAuthTokens,
} from '@/types/crm';

export class StubCrmAdapter extends BaseCrmAdapter {
  readonly provider: CrmProvider;

  constructor(provider: CrmProvider) {
    super({ maxRequestsPerWindow: 100, windowMs: 10_000 });
    this.provider = provider;
  }

  async createContact(_data: CrmContact): Promise<CrmResult> {
    return { success: false, error: `${this.provider} integration coming soon` };
  }

  async createDeal(_data: CrmDeal): Promise<CrmResult> {
    return { success: false, error: `${this.provider} integration coming soon` };
  }

  async logCall(_data: CrmCallLog): Promise<CrmResult> {
    return { success: false, error: `${this.provider} integration coming soon` };
  }

  async bookAppointment(_data: CrmAppointment): Promise<CrmResult> {
    return { success: false, error: `${this.provider} integration coming soon` };
  }

  async getConnectionStatus(): Promise<CrmConnectionStatus> {
    return { provider: this.provider, connected: false, error: 'Not yet implemented' };
  }

  async disconnect(): Promise<void> {}

  getAuthorizationUrl(_redirectUri: string, _state: string): string {
    throw new Error(`${this.provider} OAuth not yet implemented`);
  }

  async handleOAuthCallback(_code: string, _redirectUri: string): Promise<CrmOAuthTokens> {
    throw new Error(`${this.provider} OAuth not yet implemented`);
  }

  async refreshTokens(tokens: CrmOAuthTokens): Promise<CrmOAuthTokens> {
    return tokens;
  }
}
