import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Users, Link2, Copy, CheckCircle, Loader2, Award, TrendingUp,
  Mail, Calendar, Store, DollarSign, UserPlus
} from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * AmbassadorRecruitment — lets an ambassador recruit other ambassadors.
 * Shows the ambassador's recruitment share link/code, their override
 * commission rate, and a table of the ambassadors they have recruited.
 *
 * Auth: uses the dealerToken JWT (Ambassador Hub session) via dealerAuth
 * actions get_recruitment_info / get_downline.
 */
export default function AmbassadorRecruitment({ dealer }) {
  const { toast } = useToast();
  const [info, setInfo] = useState(null);
  const [downline, setDownline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const getToken = () => localStorage.getItem('dealerToken');

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const [infoRes, downlineRes] = await Promise.all([
        base44.functions.invoke('dealerAuth', { action: 'get_recruitment_info', token }),
        base44.functions.invoke('dealerAuth', { action: 'get_downline', token })
      ]);
      if (infoRes.data?.success) setInfo(infoRes.data);
      if (downlineRes.data?.success) setDownline(downlineRes.data.downline || []);
    } catch (err) {
      console.error('Failed to load recruitment data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCopy = async (text, label) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: `${label} copied`, description: 'Share it with a prospective ambassador.' });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Copy the link manually.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const overridePct = info?.referral_commission_percent || 0;
  const shareUrl = info?.share_url || '';
  const code = info?.referral_code || '';

  return (
    <div className="space-y-6">
      {/* Recruitment link card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-purple-500/10">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Recruit Ambassadors
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Share your recruitment link with other businesses. When they sign up as ambassadors through your link,
            they join your downline and you earn a <strong>{overridePct}%</strong> override commission on their ambassador earnings.
          </p>

          {/* Share link */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Your Recruitment Link
            </label>
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} className="font-mono text-xs bg-gray-50 dark:bg-gray-800" />
              <Button onClick={() => handleCopy(shareUrl, 'Recruitment link')} className="shrink-0">
                {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                Copy
              </Button>
            </div>
          </div>

          {/* Referral code */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Your Referral Code
            </label>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-lg font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                {code || '—'}
              </div>
              <Button variant="outline" size="sm" onClick={() => handleCopy(code, 'Referral code')}>
                <Copy className="w-4 h-4 mr-1" /> Copy code
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Recruits can also enter this code manually on the ambassador sign-up page.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <Users className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <div className="text-xl font-black text-gray-900 dark:text-white">{info?.total_recruits ?? 0}</div>
              <div className="text-xs text-gray-500">Total recruits</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <CheckCircle className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
              <div className="text-xl font-black text-gray-900 dark:text-white">{info?.active_recruits ?? 0}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <Award className="w-5 h-5 mx-auto text-purple-500 mb-1" />
              <div className="text-xl font-black text-gray-900 dark:text-white">{overridePct}%</div>
              <div className="text-xs text-gray-500">Override rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Downline table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-600" />
            Your Recruits
            <Badge variant="secondary" className="ml-1">{downline.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {downline.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No recruits yet</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Share your recruitment link above with prospective ambassadors. When they sign up, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Ambassador</th>
                    <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Status</th>
                    <th className="text-right font-semibold px-4 py-3">Merchants</th>
                    <th className="text-right font-semibold px-4 py-3 hidden md:table-cell">Commission</th>
                    <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Recruited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {downline.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{r.name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {r.owner_email}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant={r.status === 'active' ? 'default' : 'outline'}
                          className={r.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : ''}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                          <Store className="w-3.5 h-3.5 text-gray-400" />
                          {r.total_merchants}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          {(r.commission_earned || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">
                        {r.recruited_at
                          ? new Date(r.recruited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}