// Salesforce REST at [instance].salesforce.com/services/data/v62.0/, OAuth2 Web Server
import { StubCrmAdapter } from './stub-adapter';
import type { CrmOAuthTokens } from '@/types/crm';

export class SalesforceAdapter extends StubCrmAdapter {
  constructor(_tokens: CrmOAuthTokens) {
    super('salesforce');
  }
}
