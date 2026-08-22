import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { csvToObjects } from '@/lib/csvParser';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';

// Common CRM column name aliases → our lead fields
const FIELD_ALIASES = {
  business_name: ['business_name', 'businessname', 'company', 'companyname', 'account', 'accountname', 'organization', 'organisation', 'leadname'],
  contact_name: ['contact_name', 'contactname', 'fullname', 'name', 'firstname', 'first_name', 'lastname', 'last_name', 'contact'],
  email: ['email', 'emailaddress', 'e_mail', 'email1', 'primary_email', 'emailaddress1'],
  phone: ['phone', 'phonenumber', 'phone1', 'mobile', 'telephone', 'workphone', 'officephone', 'phone_no', 'phoneno'],
  estimated_value: ['estimated_value', 'estimatedvalue', 'amount', 'dealvalue', 'value', 'revenue', 'monthly_revenue', 'potential'],
  notes: ['notes', 'note', 'description', 'comments', 'comment', 'remarks'],
  external_id: ['external_id', 'externalid', 'id', 'leadid', 'lead_no', 'crmid', 'record_id'],
};

const SOURCE_OPTIONS = ['referral', 'website', 'social_media', 'email_campaign', 'phone_call', 'walk_in', 'other'];
const BUSINESS_OPTIONS = ['restaurant', 'retail', 'grocery', 'cafe', 'bar', 'other'];

const normalizeKey = (k) => k.toLowerCase().replace(/[\s_-]+/g, '');

function autoDetectMapping(headers) {
  const mapping = {};
  const normHeaders = headers.map(normalizeKey);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const normAliases = aliases.map(normalizeKey);
    const idx = normHeaders.findIndex((h) => normAliases.includes(h));
    if (idx >= 0) mapping[field] = headers[idx];
  }
  return mapping;
}

export default function LeadImportDialog({ open, onOpenChange, onImport, dealerId, lists }) {
  const [step, setStep] = useState('upload'); // upload | map | preview | done
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [defaultSource, setDefaultSource] = useState('other');
  const [defaultBusinessType, setDefaultBusinessType] = useState('other');
  const [defaultListId, setDefaultListId] = useState('');
  const [importSource, setImportSource] = useState('csv');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const reset = () => {
    setStep('upload');
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setError('');
    setResult(null);
  };

  const handleFile = async (file) => {
    setError('');
    if (!file) return;
    const text = await file.text();
    const rows = csvToObjects(text);
    if (rows.length === 0) {
      setError('No rows found in the file. Make sure it has a header row and at least one data row.');
      return;
    }
    const hdrs = Object.keys(rows[0]);
    setHeaders(hdrs);
    setRawRows(rows);
    setMapping(autoDetectMapping(hdrs));
    // Guess import source from filename
    const fname = file.name.toLowerCase();
    if (fname.includes('vtiger')) setImportSource('vtiger');
    else if (fname.includes('hubspot')) setImportSource('hubspot');
    else if (fname.includes('salesforce')) setImportSource('salesforce');
    else if (fname.includes('zoho')) setImportSource('zoho');
    else setImportSource('csv');
    setStep('map');
  };

  const mappedLeads = () => {
    return rawRows.map((row) => {
      const get = (field) => (mapping[field] ? row[mapping[field]] : '');
      const contactName = get('contact_name');
      return {
        business_name: get('business_name'),
        contact_name: contactName,
        email: get('email'),
        phone: get('phone'),
        estimated_value: get('estimated_value'),
        notes: get('notes'),
        external_id: get('external_id'),
        source: defaultSource,
        business_type: defaultBusinessType,
        list_ids: defaultListId ? [defaultListId] : [],
      };
    });
  };

  const handleImport = async () => {
    const leads = mappedLeads().filter((l) => l.business_name?.trim());
    if (leads.length === 0) {
      setError('No valid leads found. Make sure to map the "Business Name" column.');
      return;
    }
    setImporting(true);
    setError('');
    try {
      await onImport(leads, importSource);
      setResult({ total: leads.length });
      setStep('done');
    } catch (e) {
      setError('Import failed: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'business_name,contact_name,email,phone,estimated_value,notes\nAcme Restaurant,John Doe,john@acme.com,555-123-4567,5000,Interested in POS\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opentill_lead_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewLeads = mappedLeads().filter((l) => l.business_name?.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV exported from VTiger, HubSpot, Salesforce, Zoho, or any CRM. Map columns to lead fields and import in bulk.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Click to select a CSV file</p>
              <p className="text-xs text-gray-400 mt-1">Or drag and drop — supports VTiger, HubSpot, Salesforce, Zoho exports</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" /> Download CSV template
              </Button>
              <span className="text-xs text-gray-400">Need a sample? Download the template above.</span>
            </div>
            {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Found <strong>{rawRows.length}</strong> rows. Map your columns to lead fields:
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Default Source</Label>
                <Select value={defaultSource} onValueChange={setDefaultSource}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Default Business Type</Label>
                <Select value={defaultBusinessType} onValueChange={setDefaultBusinessType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {lists?.length > 0 && (
              <div>
                <Label className="text-xs">Add imported leads to a list (optional)</Label>
                <Select value={defaultListId} onValueChange={setDefaultListId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="No list" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No list</SelectItem>
                    {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              {Object.keys(FIELD_ALIASES).map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <div className="w-32 text-xs font-medium text-gray-600 capitalize">{field.replace(/_/g, ' ')}</div>
                  <Select value={mapping[field] || ''} onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v }))}>
                    <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="— Skip —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>— Skip —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-2">Preview (first 3 valid rows):</p>
              <div className="space-y-1">
                {previewLeads.slice(0, 3).map((l, i) => (
                  <div key={i} className="text-xs text-gray-700 flex flex-wrap gap-x-3">
                    <span className="font-medium">{l.business_name}</span>
                    {l.contact_name && <span>{l.contact_name}</span>}
                    {l.email && <span className="text-gray-500">{l.email}</span>}
                  </div>
                ))}
                {previewLeads.length === 0 && <p className="text-xs text-red-500">No valid rows — map the Business Name column.</p>}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={handleImport} disabled={importing || previewLeads.length === 0} className="gap-2">
                {importing ? 'Importing…' : `Import ${previewLeads.length} leads`}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">Import complete!</h3>
            <p className="text-sm text-gray-500">{result?.total} leads were imported successfully.</p>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}