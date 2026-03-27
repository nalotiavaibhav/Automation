// Housecall Pro REST, OAuth2+API keys, MAX plan only
import { StubCrmAdapter } from './stub-adapter';
import type { CrmOAuthTokens } from '@/types/crm';

export class HousecallProAdapter extends StubCrmAdapter {
  constructor(_tokens: CrmOAuthTokens) {
    super('housecallpro');
  }
}
