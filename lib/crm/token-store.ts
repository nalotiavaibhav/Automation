import type { CrmProvider, CrmOAuthTokens } from '@/types/crm';

export interface ITokenStore {
  getTokens(businessId: string, provider: CrmProvider): Promise<CrmOAuthTokens | null>;
  saveTokens(businessId: string, tokens: CrmOAuthTokens): Promise<void>;
  deleteTokens(businessId: string, provider: CrmProvider): Promise<void>;
  listConnections(businessId: string): Promise<CrmOAuthTokens[]>;
}

// In-memory implementation for development
export class InMemoryTokenStore implements ITokenStore {
  private store = new Map<string, CrmOAuthTokens>();

  private key(businessId: string, provider: CrmProvider): string {
    return `${businessId}:${provider}`;
  }

  async getTokens(businessId: string, provider: CrmProvider): Promise<CrmOAuthTokens | null> {
    return this.store.get(this.key(businessId, provider)) ?? null;
  }

  async saveTokens(businessId: string, tokens: CrmOAuthTokens): Promise<void> {
    this.store.set(this.key(businessId, tokens.provider), tokens);
  }

  async deleteTokens(businessId: string, provider: CrmProvider): Promise<void> {
    this.store.delete(this.key(businessId, provider));
  }

  async listConnections(businessId: string): Promise<CrmOAuthTokens[]> {
    const connections: CrmOAuthTokens[] = [];
    for (const [key, tokens] of this.store) {
      if (key.startsWith(`${businessId}:`)) {
        connections.push(tokens);
      }
    }
    return connections;
  }
}

// Singleton for development use
export const tokenStore = new InMemoryTokenStore();
