import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Ban, Loader2, Eye, Settings, UserCheck } from 'lucide-react';
import { createPageUrl } from '@/utils';
import BuilderFeeSettings from './BuilderFeeSettings';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
};

export default function BuilderManagement() {
  const [builders, setBuilders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [selectedBuilder, setSelectedBuilder] = useState(null);
  const [activeTab, setActiveTab] = useState('builders');

  useEffect(() => {
    loadBuilders();
  }, []);

  const loadBuilders = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Builder.list('-created_date');
      setBuilders(data || []);
    } catch (err) {
      setError('Failed to load builders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (builderId) => {
    setUpdating(builderId);
    try {
      await base44.entities.Builder.update(builderId, {
        status: 'verified',
        verified_at: new Date().toISOString(),
      });
      setBuilders((prev) =>
        prev.map((b) =>
          b.id === builderId
            ? { ...b, status: 'verified', verified_at: new Date().toISOString() }
            : b
        )
      );
    } catch (err) {
      setError('Failed to verify builder');
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const handleSuspend = async (builderId) => {
    if (!confirm('Are you sure you want to suspend this builder?')) return;
    setUpdating(builderId);
    try {
      await base44.entities.Builder.update(builderId, { status: 'suspended' });
      setBuilders((prev) =>
        prev.map((b) => (b.id === builderId ? { ...b, status: 'suspended' } : b))
      );
    } catch (err) {
      setError('Failed to suspend builder');
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Nav */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('builders')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'builders'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Builders
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'fees'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-3.5 h-3.5" /> Platform Fees
        </button>
      </div>

      {activeTab === 'fees' && <BuilderFeeSettings />}

      {activeTab === 'builders' && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{builders.length}</div>
                  <p className="text-sm text-gray-600 mt-1">Total Builders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {builders.filter((b) => b.status === 'verified').length}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Verified</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {builders.filter((b) => b.status === 'pending').length}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Pending</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Builders Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Builders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium">Company</th>
                      <th className="text-left py-3 px-4 font-medium">Contact</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Stats</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {builders.map((builder) => (
                      <tr key={builder.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{builder.company_name}</p>
                            <p className="text-xs text-gray-600">{builder.full_name}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{builder.user_email}</p>
                            <p className="text-xs text-gray-600">{builder.support_email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={STATUS_COLORS[builder.status] || 'bg-gray-100 text-gray-800'}>
                            {builder.status.charAt(0).toUpperCase() + builder.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p className="text-gray-900">
                              <span className="font-medium">{builder.total_chips || 0}</span> Chips
                            </p>
                            <p className="text-xs text-gray-600">
                              ${(builder.total_earnings || 0).toFixed(2)} earned
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedBuilder(builder)}
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {builder.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleVerify(builder.id)}
                                disabled={updating === builder.id}
                              >
                                {updating === builder.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                Verify
                              </Button>
                            )}
                            {builder.status !== 'suspended' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleSuspend(builder.id)}
                                disabled={updating === builder.id}
                              >
                                {updating === builder.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {builders.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No builders found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Builder Details */}
          {selectedBuilder && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Builder Details</CardTitle>
                <button
                  onClick={() => setSelectedBuilder(null)}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium">{selectedBuilder.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Company</p>
                    <p className="font-medium">{selectedBuilder.company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedBuilder.user_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Support Email</p>
                    <p className="font-medium">{selectedBuilder.support_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={STATUS_COLORS[selectedBuilder.status]}>
                      {selectedBuilder.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Stripe Connected</p>
                    <p className="font-medium">
                      {selectedBuilder.stripe_connected ? '✓ Connected' : '✗ Not Connected'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Chips</p>
                    <p className="font-medium text-lg">{selectedBuilder.total_chips || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="font-medium text-lg">{selectedBuilder.total_sales || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Earnings</p>
                    <p className="font-medium text-lg">
                      ${(selectedBuilder.total_earnings || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Installs</p>
                    <p className="font-medium text-lg">{selectedBuilder.total_installs || 0}</p>
                  </div>
                </div>

                {selectedBuilder.bio && (
                  <div>
                    <p className="text-sm text-gray-600">Bio</p>
                    <p className="text-gray-900">{selectedBuilder.bio}</p>
                  </div>
                )}

                <div className="border-t pt-4 flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedBuilder(null)}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}