import type {
  CrmContact, CrmDeal, CrmCallLog, CrmAppointment,
  CrmResult, CrmConnectionStatus, CrmProvider, CrmOAuthTokens
} from '@/types/crm';

export interface ICrmAdapter {
  readonly provider: CrmProvider;

  createContact(data: CrmContact): Promise<CrmResult>;
  createDeal(data: CrmDeal): Promise<CrmResult>;
  logCall(data: CrmCallLog): Promise<CrmResult>;
  bookAppointment(data: CrmAppointment): Promise<CrmResult>;

  getConnectionStatus(): Promise<CrmConnectionStatus>;
  disconnect(): Promise<void>;

  getAuthorizationUrl(redirectUri: string, state: string): string;
  handleOAuthCallback(code: string, redirectUri: string): Promise<CrmOAuthTokens>;
  refreshTokens(tokens: CrmOAuthTokens): Promise<CrmOAuthTokens>;
}
