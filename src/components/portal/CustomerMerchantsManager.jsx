import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  Search,
  Plus,
  X,
  Loader2,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Lets a logged-in customer search openTILL merchants by business name and add
 * them to their portal (so they can use rewards at any openTILL location), and
 * shows all linked merchants — both manually added and referred (with status).
 */
export default function CustomerMerchantsManager({ customerId, sessionPin, linkedMerchants, setLinkedMerchants }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const { data } = await base44.functions.invoke('manageCustomerPortal', {
        action: 'search_merchants',
        query: query.trim(),
      });
      if (data?.success) {
        // Hide merchants already linked.
        const linkedIds = new Set((linkedMerchants || []).map((m) => m.merchant_id));
        setResults((data.merchants || []).filter((m) => !linkedIds.has(m.id)));
        setShowResults(true);
      }
    } catch {
      /* ignore */
    }
    setSearching(false);
  };

  const add = async (merchant) => {
    setAdding(merchant.id);
    try {
      const { data } = await base44.functions.invoke('manageCustomerPortal', {
        action: 'add_merchant',
        customer_id: customerId,
        pin: sessionPin,
        merchant_id: merchant.id,
      });
      if (data?.success) {
        setLinkedMerchants(data.linked_merchants || []);
        setResults((r) => r.filter((m) => m.id !== merchant.id));
      }
    } catch {
      /* ignore */
    }
    setAdding(null);
  };

  const remove = async (link) => {
    setRemoving(link.id);
    try {
      const { data } = await base44.functions.invoke('manageCustomerPortal', {
        action: 'remove_merchant',
        customer_id: customerId,
        pin: sessionPin,
        link_id: link.id,
      });
      if (data?.success) setLinkedMerchants(data.linked_merchants || []);
    } catch {
      /* ignore */
    }
    setRemoving(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-5 h-5" /> My Merchants
        </CardTitle>
        <CardDescription>
          Add any openTILL merchant so you can earn and use rewards at every location you visit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchants by name…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" disabled={searching || query.trim().length < 2}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </form>

        {showResults && results.length > 0 && (
          <div className="space-y-2 rounded-lg border p-2 max-h-60 overflow-y-auto">
            {results.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md p-2 hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.business_name}</p>
                  {m.opentill_subdomain && (
                    <p className="text-xs text-gray-400">{m.opentill_subdomain}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => add(m)} disabled={adding === m.id}>
                  {adding === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
        {showResults && results.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">No new merchants found. Try a different name.</p>
        )}

        <div className="space-y-2">
          {(linkedMerchants || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No merchants yet. Search above to add your first one.
            </p>
          ) : (
            (linkedMerchants || []).map((link) => (
              <div key={link.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{link.merchant_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {link.link_type === 'referred' ? (
                      link.referral_status === 'converted' ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" /> Referral converted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 border-amber-300">
                          <Clock className="w-3 h-3 mr-1" /> Referral pending
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary">Added</Badge>
                    )}
                  </div>
                </div>
                {link.link_type === 'added' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(link)}
                    disabled={removing === link.id}
                    title="Remove"
                  >
                    {removing === link.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 text-gray-400" />}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}