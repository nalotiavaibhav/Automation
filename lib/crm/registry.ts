import type { ICrmAdapter } from './adapter';
import type { CrmProvider, CrmOAuthTokens } from '@/types/crm';

const adapterFactories = new Map<CrmProvider, (tokens: CrmOAuthTokens) => ICrmAdapter>();

export function registerCrmAdapter(
  provider: CrmProvider,
  factory: (tokens: CrmOAuthTokens) => ICrmAdapter
) {
  adapterFactories.set(provider, factory);
}

export function getCrmAdapter(provider: CrmProvider, tokens: CrmOAuthTokens): ICrmAdapter {
  const factory = adapterFactories.get(provider);
  if (!factory) throw new Error(`No adapter registered for CRM provider: ${provider}`);
  return factory(tokens);
}

export function getRegisteredProviders(): CrmProvider[] {
  return Array.from(adapterFactories.keys());
}

export function isProviderRegistered(provider: CrmProvider): boolean {
  return adapterFactories.has(provider);
}
