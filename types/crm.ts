export type CrmProvider = 'hubspot' | 'servicetitan' | 'jobber' | 'zoho' | 'salesforce' | 'housecallpro';

export interface CrmContact {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  source?: string;
  notes?: string;
}

export interface CrmDeal {
  title: string;
  contactId: string;
  externalContactId: string;
  description?: string;
  serviceType?: string;
  urgency?: 'routine' | 'urgent' | 'emergency';
  estimatedValue?: number;
  stage?: string;
}

export interface CrmCallLog {
  contactId: string;
  externalContactId: string;
  direction: 'inbound' | 'outbound';
  duration: number;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  outcome?: string;
  timestamp: string;
}

export interface CrmAppointment {
  contactId: string;
  externalContactId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  serviceType?: string;
}

export interface CrmResult<T = string> {
  success: boolean;
  externalId?: T;
  error?: string;
  rawResponse?: unknown;
}

export interface CrmConnectionStatus {
  provider: CrmProvider;
  connected: boolean;
  lastSyncAt?: string;
  accountName?: string;
  error?: string;
}

export interface CrmOAuthTokens {
  provider: CrmProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes?: string[];
  tenantId?: string;
  appKey?: string;
}

export interface CrmFieldMapping {
  provider: CrmProvider;
  mappings: Record<string, string>;
}

export interface CrmProviderConfig {
  id: CrmProvider;
  name: string;
  description: string;
  authType: 'oauth2_code' | 'credentials';
  available: boolean;
  features: string[];
}
