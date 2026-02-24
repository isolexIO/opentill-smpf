import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Users, Copy, CheckCircle, Gift, TrendingUp, Wallet } from 'lucide-react';

export default function ReferralDashboard() {
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({
    total_referrals: 0,
    active_referrals: 0,
    total_rewards: 0,
    pending_referrals: 0
  });

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    setLoading(true);
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      const pinUser = pinUserJSON ? JSON.parse(pinUserJSON) : null;
      const user = await base44.auth.me();
      const merchantId = pinUser?.merchant_id || user?.merchant_id;

      // Get merchant
      const merchants = await base44.entities.Merchant.filter({ id: merchantId });
      if (merchants && merchants.length > 0) {
        const merchantData = merchants[0];
        setMerchant(merchantData);
        
        if (merchantData.referral_code) {
          setReferralCode(merchantData.referral_code);
          setShareUrl(`${window.location.origin}/MerchantOnboarding?ref=${merchantData.referral_code}`);
        }
      }

      // Get referrals
      const referralData = await base44.entities.MerchantReferral.filter({
        referrer_merchant_id: merchantId
      });
      
      setReferrals(referralData || []);

      // Calculate stats
      const total = referralData?.length || 0;
      const active = referralData?.filter(r => r.status === 'active').length || 0;
      const pending = referralData?.filter(r => r.status === 'pending').length || 0;
      const totalRewards = referralData?.reduce((sum, r) => sum + (r.total_rewards_earned || 0), 0) || 0;

      setStats({
        total_referrals: total,
        active_referrals: active,
        pending_referrals: pending,
        total_rewards: totalRewards
      });

    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    setLoading(true);
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      const pinUser = pinUserJSON ? JSON.parse(pinUserJSON) : null;
      const merchantId = pinUser?.merchant_id || merchant?.id;

      const { data } = await base44.functions.invoke('generateReferralCode', {
        merchant_id: merchantId
      });
      
      if (data.success) {
        setReferralCode(data.referral_code);
        setShareUrl(data.share_url);
        alert('Referral code generated successfully!');
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
      alert('Failed to generate referral code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          Referral Program
        </h2>
        <p className="text-gray-500">Refer other merchants and earn $DUC rewards</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_referrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active_referrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_referrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Rewards Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.total_rewards.toFixed(2)} $DUC
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Your Referral Code
          </CardTitle>
          <CardDescription>
            Share your code with other businesses and earn rewards when they process payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralCode ? (
            <>
              <div>
                <label className="text-sm font-medium">Referral Code</label>
                <div className="flex gap-2 mt-1">
                  <Input value={referralCode} readOnly className="font-mono text-lg" />
                  <Button
                    onClick={() => copyToClipboard(referralCode)}
                    variant="outline"
                    className="shrink-0"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Share Link</label>
                <div className="flex gap-2 mt-1">
                  <Input value={shareUrl} readOnly className="text-sm" />
                  <Button
                    onClick={() => copyToClipboard(shareUrl)}
                    variant="outline"
                    className="shrink-0"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <TrendingUp className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Earn rewards every time your referred merchants earn $DUC! The more they process, the more you earn.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You don't have a referral code yet</p>
              <Button onClick={generateReferralCode} disabled={loading}>
                <Gift className="w-4 h-4 mr-2" />
                Generate Referral Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral List */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>Track merchants you've referred</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{referral.referred_name || 'New Merchant'}</div>
                    <div className="text-sm text-gray-500">
                      Status: <span className={
                        referral.status === 'active' ? 'text-green-600' :
                        referral.status === 'pending' ? 'text-yellow-600' :
                        'text-gray-600'
                      }>{referral.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-purple-600">
                      {(referral.total_rewards_earned || 0).toFixed(2)} $DUC
                    </div>
                    <div className="text-sm text-gray-500">
                      ${(referral.referred_merchant_lifetime_volume || 0).toFixed(2)} volume
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Share your referral code or link with other businesses</li>
            <li>When they sign up using your code, they become your referral</li>
            <li>Once they're activated and start processing payments, you earn rewards</li>
            <li>You get a percentage of the $DUC rewards they earn from CC processing</li>
            <li>All rewards are automatically added to your vault and are claimable</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}