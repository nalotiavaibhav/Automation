'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, Save, Loader2, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CrmProvider } from '@/types/crm';

interface FieldMappingEditorProps {
  provider: CrmProvider;
}

interface FieldMapping {
  flowmaxField: string;
  flowmaxLabel: string;
  crmField: string;
}

const FLOWMAX_FIELDS = [
  { field: 'firstName', label: 'First Name' },
  { field: 'lastName', label: 'Last Name' },
  { field: 'phone', label: 'Phone' },
  { field: 'email', label: 'Email' },
  { field: 'address', label: 'Address' },
  { field: 'serviceType', label: 'Service Type' },
  { field: 'urgency', label: 'Urgency' },
  { field: 'notes', label: 'Notes' },
];

const CRM_FIELD_OPTIONS: Record<CrmProvider, { value: string; label: string }[]> = {
  hubspot: [
    { value: 'firstname', label: 'First Name' },
    { value: 'lastname', label: 'Last Name' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'email', label: 'Email' },
    { value: 'address', label: 'Street Address' },
    { value: 'hs_lead_status', label: 'Lead Status' },
    { value: 'hs_priority', label: 'Priority' },
    { value: 'notes_last_contacted', label: 'Notes (Last Contacted)' },
    { value: 'description', label: 'Description' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'zip', label: 'Zip Code' },
    { value: 'company', label: 'Company' },
    { value: '__unmapped__', label: '-- Do not map --' },
  ],
  servicetitan: [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'phoneNumber', label: 'Phone Number' },
    { value: 'email', label: 'Email' },
    { value: 'street', label: 'Street' },
    { value: 'type', label: 'Job Type' },
    { value: 'priority', label: 'Priority' },
    { value: 'summary', label: 'Summary' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'zip', label: 'Zip Code' },
    { value: '__unmapped__', label: '-- Do not map --' },
  ],
  jobber: [],
  zoho: [],
  salesforce: [],
  housecallpro: [],
};

const DEFAULT_MAPPINGS: Record<CrmProvider, Record<string, string>> = {
  hubspot: {
    firstName: 'firstname',
    lastName: 'lastname',
    phone: 'phone',
    email: 'email',
    address: 'address',
    serviceType: 'hs_lead_status',
    urgency: 'hs_priority',
    notes: 'description',
  },
  servicetitan: {
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'phoneNumber',
    email: 'email',
    address: 'street',
    serviceType: 'type',
    urgency: 'priority',
    notes: 'summary',
  },
  jobber: {},
  zoho: {},
  salesforce: {},
  housecallpro: {},
};

export function FieldMappingEditor({ provider }: FieldMappingEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const defaults = DEFAULT_MAPPINGS[provider] || {};
    setMappings(
      FLOWMAX_FIELDS.map((f) => ({
        flowmaxField: f.field,
        flowmaxLabel: f.label,
        crmField: defaults[f.field] || '__unmapped__',
      }))
    );
  }, [provider]);

  function handleFieldChange(flowmaxField: string, crmField: string) {
    setMappings((prev) =>
      prev.map((m) =>
        m.flowmaxField === flowmaxField ? { ...m, crmField } : m
      )
    );
    setDirty(true);
  }

  function handleReset() {
    const defaults = DEFAULT_MAPPINGS[provider] || {};
    setMappings(
      FLOWMAX_FIELDS.map((f) => ({
        flowmaxField: f.field,
        flowmaxLabel: f.label,
        crmField: defaults[f.field] || '__unmapped__',
      }))
    );
    setDirty(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const mappingRecord: Record<string, string> = {};
      for (const m of mappings) {
        if (m.crmField !== '__unmapped__') {
          mappingRecord[m.flowmaxField] = m.crmField;
        }
      }

      await fetch(`/api/integrations/${provider}/field-mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: mappingRecord }),
      });

      setDirty(false);
    } catch {
      // Error handling silently — could add toast notifications later
    } finally {
      setSaving(false);
    }
  }

  const crmOptions = CRM_FIELD_OPTIONS[provider] || [];

  if (crmOptions.length === 0) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-xs font-medium text-gray-500 transition-colors duration-200 hover:text-gray-700"
      >
        <span>Field Mappings</span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2.5 ag-expand">
          {mappings.map((mapping) => (
            <div
              key={mapping.flowmaxField}
              className="flex items-center gap-2"
            >
              <Label className="w-24 shrink-0 text-xs text-gray-600">
                {mapping.flowmaxLabel}
              </Label>
              <ArrowRight className="h-3 w-3 shrink-0 text-gray-300" />
              <Select
                value={mapping.crmField}
                onValueChange={(value) =>
                  value && handleFieldChange(mapping.flowmaxField, value)
                }
              >
                <SelectTrigger className="h-7 w-full text-xs" size="sm">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {crmOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={handleReset}
              disabled={!dirty}
            >
              <RotateCcw className="h-3 w-3" />
              Reset to Defaults
            </Button>
            <Button
              size="xs"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  Save Mappings
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
