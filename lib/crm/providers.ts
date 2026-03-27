import type { CrmProviderConfig } from '@/types/crm';

export const CRM_PROVIDERS: CrmProviderConfig[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Full CRM with contacts, deals, calls, and meetings.',
    authType: 'oauth2_code',
    available: true,
    features: ['Contacts', 'Deals', 'Call Logging', 'Meetings'],
  },
  {
    id: 'servicetitan',
    name: 'ServiceTitan',
    description: 'Field service management for plumbing, HVAC, electrical.',
    authType: 'credentials',
    available: true,
    features: ['Customers', 'Jobs', 'Appointments', 'Call Logging'],
  },
  {
    id: 'jobber',
    name: 'Jobber',
    description: 'Job management for home service businesses.',
    authType: 'oauth2_code',
    available: false,
    features: ['Clients', 'Jobs', 'Scheduling'],
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Cost-effective CRM with strong automation.',
    authType: 'oauth2_code',
    available: false,
    features: ['Contacts', 'Deals', 'Activities', 'Events'],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Enterprise CRM platform with extensive customization.',
    authType: 'oauth2_code',
    available: false,
    features: ['Leads', 'Contacts', 'Tasks', 'Events'],
  },
  {
    id: 'housecallpro',
    name: 'Housecall Pro',
    description: 'Field service management with scheduling and invoicing.',
    authType: 'credentials',
    available: false,
    features: ['Customers', 'Jobs', 'Estimates'],
  },
];
