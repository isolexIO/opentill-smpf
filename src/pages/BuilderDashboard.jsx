import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Package, Plus, TrendingUp, Users, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import SubmissionManager from '@/components/builders/SubmissionManager.jsx';
import AnalyticsDashboard from '@/components/builders/AnalyticsDashboard.jsx';
import ProfileSettings from '@/components/builders/ProfileSettings.jsx';
import ChipSubmissionDocs from '@/components/builders/ChipSubmissionDocs.jsx';

export default function BuilderDashboardPage() {
  const [user, setUser] = useState(null);
  const [builder, setBuilder] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('submissions');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        window.location.href = createPageUrl('EmailLogin');
        return;
      }
      setUser(currentUser);

      // Load builder profile
      const builders = await base44.entities.Builder.filter({ user_email: currentUser.email });
      if (builders && builders.length > 0) {
        setBuilder(builders[0]);

        // Load submissions
        const subs = await base44.entities.ChipSubmission.filter(
          { builder_id: builders[0].id },
          '-created_date'
        );
        setSubmissions(subs || []);
      } else {
        window.location.href = createPageUrl('BuilderOnboarding');
      }
    } catch (err) {
      console.error('Load error:', err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!builder) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto" />
            <p className="text-gray-600">Builder profile not found</p>
            <Button
              onClick={() => (window.location.href = createPageUrl('BuilderOnboarding'))}
              className="w-full"
            >
              Complete Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Earnings',
      value: `$${builder.total_earnings?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Chips Published',
      value: builder.total_chips || 0,
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Sales',
      value: builder.total_sales || 0,
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Total Installs',
      value: builder.total_installs || 0,
      icon: Users,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900">Builder Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, <span className="font-bold">{builder.company_name}</span>
            </p>
          </div>
          <Button
            onClick={() => (window.location.href = createPageUrl('SubmitChip'))}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-12 font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Submit New Chip
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx}>
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stripe Connection Status */}
        {!builder.stripe_connected && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">Payment Setup Incomplete</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Connect your Stripe account to start receiving payouts
                </p>
              </div>
              <Button
                onClick={() => (window.location.href = createPageUrl('BuilderSettings'))}
                variant="outline"
                className="ml-4 shrink-0"
              >
                Complete Setup
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b bg-transparent rounded-none px-6 pt-6 pb-0">
              <TabsTrigger value="submissions" className="rounded-t-lg">
                My Chips ({submissions.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-t-lg">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-t-lg">
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submissions">
              <SubmissionManager submissions={submissions} builder={builder} onRefresh={loadData} />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsDashboard submissions={submissions} builder={builder} />
            </TabsContent>

            <TabsContent value="settings">
              <ProfileSettings builder={builder} user={user} onUpdated={loadData} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}