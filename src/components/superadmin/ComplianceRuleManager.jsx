import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShieldAlert, Plus, Pencil, Trash2, CheckCircle, Ban, RefreshCw, X, Power,
} from 'lucide-react';

const EMPTY_RULE = {
  jurisdiction_country: 'US',
  state_or_territory: 'ALL',
  transaction_channel: 'all',
  surcharge_status: 'conditional',
  cash_discount_status: 'allowed',
  dual_pricing_status: 'allowed',
  maximum_state_pct: 4,
  maximum_network_pct: 4,
  maximum_acquirer_pct: 4,
  maximum_processor_pct: 4,
  legal_review_status: 'pending',
  status: 'active',
  rule_version: '1.0.0',
  effective_date: '',
  expiration_date: '',
  source_reference: '',
  required_disclosures: '',
  both_prices_required: true,
};

// ComplianceRule manager + dual-pricing kill switch.
// The pricing engine only enforces rules that are status='active' AND
// legal_review_status='approved' AND within their effective/expiration window.
// Retiring every rule (or leaving none approved) = fail-closed: no surcharge
// or dual-pricing adjustment is applied anywhere.
export default function ComplianceRuleManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // rule being edited, or EMPTY_RULE for new, or null
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await base44.entities.ComplianceRule.list('-created_date', 100);
      setRules(list || []);
    } catch (e) {
      setError(e.message || 'Failed to load compliance rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const startNew = () => setEditing({ ...EMPTY_RULE });
  const startEdit = (rule) => setEditing({ ...rule });
  const cancelEdit = () => setEditing(null);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...editing };
      if (payload.effective_date === '') payload.effective_date = undefined;
      if (payload.expiration_date === '') payload.expiration_date = undefined;
      if (editing.id) {
        await base44.entities.ComplianceRule.update(editing.id, payload);
      } else {
        await base44.entities.ComplianceRule.create(payload);
      }
      setEditing(null);
      await loadRules();
    } catch (e) {
      setError(e.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const setField = (k, v) => setEditing((prev) => ({ ...prev, [k]: v }));

  const retire = async (rule) => {
    if (!confirm(`Retire rule ${rule.jurisdiction_country}/${rule.state_or_territory}? Retired rules are not enforced (fail-closed).`)) return;
    try {
      await base44.entities.ComplianceRule.update(rule.id, { status: 'retired' });
      await loadRules();
    } catch (e) { setError(e.message); }
  };

  const reactivate = async (rule) => {
    try {
      await base44.entities.ComplianceRule.update(rule.id, { status: 'active' });
      await loadRules();
    } catch (e) { setError(e.message); }
  };

  const approveLegal = async (rule) => {
    try {
      await base44.entities.ComplianceRule.update(rule.id, { legal_review_status: 'approved' });
      await loadRules();
    } catch (e) { setError(e.message); }
  };

  const remove = async (rule) => {
    if (!confirm('Permanently delete this compliance rule?')) return;
    try {
      await base44.entities.ComplianceRule.delete(rule.id);
      await loadRules();
    } catch (e) { setError(e.message); }
  };

  const killAll = async () => {
    if (!confirm('KILL SWITCH: Retire ALL compliance rules? This disables every dual-pricing and surcharge adjustment platform-wide (fail-closed) until rules are re-approved.')) return;
    try {
      for (const r of rules) {
        if (r.status === 'active') {
          await base44.entities.ComplianceRule.update(r.id, { status: 'retired' });
        }
      }
      await loadRules();
    } catch (e) { setError(e.message); }
  };

  const activeCount = rules.filter(r => r.status === 'active' && r.legal_review_status === 'approved').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Dual-Pricing &amp; Surcharge Compliance Rules
          </CardTitle>
          <CardDescription>
            Versioned, date-controlled rules that the integer-cents fee engine enforces.
            Only <b>active</b> + <b>legally approved</b> rules within their effective window are applied.
            With none approved, every pricing adjustment fails closed (no surcharge, no dual-pricing differential).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button onClick={startNew} disabled={editing}><Plus className="w-4 h-4 mr-1" /> New Rule</Button>
            <Button variant="outline" onClick={loadRules} disabled={loading}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
            <Button variant="destructive" onClick={killAll} disabled={loading || activeCount === 0}>
              <Power className="w-4 h-4 mr-1" /> Kill Switch (retire all)
            </Button>
            <span className="text-sm text-gray-500 ml-auto">{activeCount} active/approved of {rules.length} rules</span>
          </div>

          {error && (
            <Alert className="bg-red-50 border-red-200 mb-4">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="text-gray-500">No rules configured — pricing adjustments are currently fail-closed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">Jurisdiction</th>
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 pr-3">Surcharge</th>
                    <th className="py-2 pr-3">Dual Pricing</th>
                    <th className="py-2 pr-3">Cap %</th>
                    <th className="py-2 pr-3">Legal</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 pr-3 font-medium">{r.jurisdiction_country}/{r.state_or_territory}</td>
                      <td className="py-2 pr-3">{r.transaction_channel}</td>
                      <td className="py-2 pr-3">{r.surcharge_status}</td>
                      <td className="py-2 pr-3">{r.dual_pricing_status}</td>
                      <td className="py-2 pr-3">{r.maximum_state_pct ?? '—'}</td>
                      <td className="py-2 pr-3">
                        <span className={r.legal_review_status === 'approved' ? 'text-green-600' : 'text-amber-600'}>
                          {r.legal_review_status}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={r.status === 'active' ? 'text-green-600' : 'text-gray-400'}>{r.status}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(r)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                          {r.legal_review_status !== 'approved' && (
                            <Button size="icon" variant="ghost" onClick={() => approveLegal(r)} title="Approve legal"><CheckCircle className="w-4 h-4 text-green-600" /></Button>
                          )}
                          {r.status === 'active' ? (
                            <Button size="icon" variant="ghost" onClick={() => retire(r)} title="Retire"><Ban className="w-4 h-4 text-amber-600" /></Button>
                          ) : (
                            <Button size="icon" variant="ghost" onClick={() => reactivate(r)} title="Reactivate"><RefreshCw className="w-4 h-4 text-green-600" /></Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => remove(r)} title="Delete"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editing.id ? 'Edit Rule' : 'New Rule'}</span>
              <Button size="icon" variant="ghost" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Input value={editing.jurisdiction_country || ''} onChange={(e) => setField('jurisdiction_country', e.target.value.toUpperCase())} placeholder="US" />
            </div>
            <div>
              <Label>State / Territory (or ALL)</Label>
              <Input value={editing.state_or_territory || ''} onChange={(e) => setField('state_or_territory', e.target.value.toUpperCase())} placeholder="ALL" />
            </div>
            <div>
              <Label>Transaction Channel</Label>
              <select className="w-full border rounded h-9 px-2" value={editing.transaction_channel} onChange={(e) => setField('transaction_channel', e.target.value)}>
                {['all', 'card_present', 'card_not_present', 'online', 'telephone'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Rule Version</Label>
              <Input value={editing.rule_version || ''} onChange={(e) => setField('rule_version', e.target.value)} placeholder="1.0.0" />
            </div>
            <div>
              <Label>Surcharge Status</Label>
              <select className="w-full border rounded h-9 px-2" value={editing.surcharge_status} onChange={(e) => setField('surcharge_status', e.target.value)}>
                {['allowed', 'prohibited', 'conditional'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Dual Pricing Status</Label>
              <select className="w-full border rounded h-9 px-2" value={editing.dual_pricing_status} onChange={(e) => setField('dual_pricing_status', e.target.value)}>
                {['allowed', 'prohibited', 'conditional'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Max State %</Label>
              <Input type="number" step="0.01" value={editing.maximum_state_pct ?? ''} onChange={(e) => setField('maximum_state_pct', Number(e.target.value))} />
            </div>
            <div>
              <Label>Max Network %</Label>
              <Input type="number" step="0.01" value={editing.maximum_network_pct ?? ''} onChange={(e) => setField('maximum_network_pct', Number(e.target.value))} />
            </div>
            <div>
              <Label>Effective Date (UTC)</Label>
              <Input type="datetime-local" value={editing.effective_date ? editing.effective_date.slice(0, 16) : ''} onChange={(e) => setField('effective_date', e.target.value ? new Date(e.target.value).toISOString() : '')} />
            </div>
            <div>
              <Label>Expiration Date (UTC)</Label>
              <Input type="datetime-local" value={editing.expiration_date ? editing.expiration_date.slice(0, 16) : ''} onChange={(e) => setField('expiration_date', e.target.value ? new Date(e.target.value).toISOString() : '')} />
            </div>
            <div>
              <Label>Legal Review Status</Label>
              <select className="w-full border rounded h-9 px-2" value={editing.legal_review_status} onChange={(e) => setField('legal_review_status', e.target.value)}>
                {['pending', 'approved', 'rejected'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="w-full border rounded h-9 px-2" value={editing.status} onChange={(e) => setField('status', e.target.value)}>
                {['active', 'retired'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Source Reference (statute / network rule)</Label>
              <Input value={editing.source_reference || ''} onChange={(e) => setField('source_reference', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Required Disclosures</Label>
              <Input value={editing.required_disclosures || ''} onChange={(e) => setField('required_disclosures', e.target.value)} />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Rule'}</Button>
              <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}