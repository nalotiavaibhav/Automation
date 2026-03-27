// Zoho CRM REST API v8 at zohoapis.com/crm/v8/, OAuth2 auth code
import { StubCrmAdapter } from './stub-adapter';
import type { CrmOAuthTokens } from '@/types/crm';

export class ZohoAdapter extends StubCrmAdapter {
  constructor(_tokens: CrmOAuthTokens) {
    super('zoho');
  }
}
