// Jobber: GraphQL at api.getjobber.com/api/graphql, OAuth2 auth code
import { StubCrmAdapter } from './stub-adapter';
import type { CrmOAuthTokens } from '@/types/crm';

export class JobberAdapter extends StubCrmAdapter {
  constructor(_tokens: CrmOAuthTokens) {
    super('jobber');
  }
}
