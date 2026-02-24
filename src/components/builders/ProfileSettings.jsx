import React, { useState } from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function ProfileSettings({ builder, user, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    full_name: builder.full_name || '',
    company_name: builder.company_name || '',
    bio: builder.bio || '',
    website: builder.website || '',
    github_url: builder.github_url || '',
    twitter_url: builder.twitter_url || '',
    support_email: builder.support_email || '',
  });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await base44.functions.invoke('updateBuilderProfile', {
        builder_id: builder.id,
        ...formData,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully');
      setEditing(false);
      setTimeout(() => onUpdated(), 1500);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardContent className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-gray-900">Profile Settings</h3>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <span className="text-sm text-green-700">{success}</span>
        </div>
      )}

      <div className="space-y-4">
        {editing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                }
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <Input
                value={formData.company_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                }
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                disabled={saving}
                rows="3"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <Input
                  value={formData.website}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, website: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub
                </label>
                <Input
                  value={formData.github_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, github_url: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twitter
                </label>
                <Input
                  value={formData.twitter_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, twitter_url: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Support Email
                </label>
                <Input
                  value={formData.support_email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, support_email: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Full Name</p>
              <p className="font-medium text-gray-900">{formData.full_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Company</p>
              <p className="font-medium text-gray-900">{formData.company_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Bio</p>
              <p className="text-gray-700">{formData.bio || 'No bio added'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Website</p>
                <p className="text-blue-600 text-sm truncate">
                  {formData.website ? (
                    <a href={formData.website} target="_blank" rel="noreferrer">
                      {formData.website}
                    </a>
                  ) : (
                    'Not added'
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">GitHub</p>
                <p className="text-blue-600 text-sm truncate">
                  {formData.github_url ? (
                    <a href={formData.github_url} target="_blank" rel="noreferrer">
                      {formData.github_url}
                    </a>
                  ) : (
                    'Not added'
                  )}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Support Email</p>
              <p className="font-medium text-gray-900">{formData.support_email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stripe Status */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="font-bold text-gray-900 mb-4">Payment Information</h4>
        {builder.stripe_connected ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">✓ Stripe Connected</p>
            <p className="text-sm text-green-700 mt-1">
              Stripe ID: {builder.stripe_connect_id}
            </p>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
            <p className="text-yellow-800 font-medium">Stripe Not Connected</p>
            <p className="text-sm text-yellow-700">
              Connect your Stripe account to receive payouts
            </p>
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
              Connect Stripe
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  );
}