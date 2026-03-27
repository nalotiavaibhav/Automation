import { registerCrmAdapter } from '../registry';
import { HubSpotAdapter } from './hubspot';
import { ServiceTitanAdapter } from './servicetitan';
import { JobberAdapter } from './jobber';
import { ZohoAdapter } from './zoho';
import { SalesforceAdapter } from './salesforce';
import { HousecallProAdapter } from './housecallpro';

export function registerAllAdapters() {
  registerCrmAdapter('hubspot', (tokens) => new HubSpotAdapter(tokens));
  registerCrmAdapter('servicetitan', (tokens) => new ServiceTitanAdapter(tokens));
  registerCrmAdapter('jobber', (tokens) => new JobberAdapter(tokens));
  registerCrmAdapter('zoho', (tokens) => new ZohoAdapter(tokens));
  registerCrmAdapter('salesforce', (tokens) => new SalesforceAdapter(tokens));
  registerCrmAdapter('housecallpro', (tokens) => new HousecallProAdapter(tokens));
}
