import React, { useState, useEffect } from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SolanaWalletInput from '@/components/shared/SolanaWalletInput';

export default function ProfileSettings({ builder, user, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // After returning from Stripe onboarding, sync connection status
  useEffect(() => {
    if (builder.stripe_connect_id && !builder.stripe_connected) {
      base44.functions
        .invoke('createBuilderStripeConnect', {
          return_url: window.location.href,
          refresh_url: window.location.href,
        })
        .then((res) => {
          if (res.data?.connected) onUpdated();
        })
        .catch(() => {});
    }
  }, [builder.id, builder.stripe_connect_id, builder.stripe_connected, onUpdated]);

  const handleConnectStripe = async () => {
    setConnecting(true);
    setError('');
    setSuccess('');
    try {
      const res = await base44.functions.invoke('createBuilderStripeConnect', {
        return_url: window.location.href,
        refresh_url: window.location.href,
      });
      const data = res.data;
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to connect Stripe');
      }
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
        return;
      }
      setSuccess('Stripe connected successfully!');
      setTimeout(() => onUpdated(), 1200);
    } catch (err) {
      setError(err.message || 'Failed to connect Stripe');
    } finally {
      setConnecting(false);
    }
  };

  const [savingPayout, setSavingPayout] = useState(false);

  const handleSavePayout = async () => {
    if (formData.payout_method === 'solana' && !formData.solana_wallet_address?.trim()) {
      setError('Please connect or enter a Solana wallet address to receive $DUC payouts.');
      return;
    }
    setSavingPayout(true);
    setError('');
    setSuccess('');
    try {
      const res = await base44.functions.invoke('updateBuilderProfile', {
        builder_id: builder.id,
        payout_method: formData.payout_method,
        solana_wallet_address: formData.solana_wallet_address,
      });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to save payout settings');
      }
      setSuccess('Payout settings saved');
      setTimeout(() => onUpdated(), 1200);
    } catch (err) {
      setError(err.message || 'Failed to save payout settings');
    } finally {
      setSavingPayout(false);
    }
  };

  const [formData, setFormData] = useState({
    full_name: builder.full_name || '',
    company_name: builder.company_name || '',
    bio: builder.bio || '',
    website: builder.website || '',
    github_url: builder.github_url || '',
    twitter_url: builder.twitter_url || '',
    support_email: builder.support_email || '',
    payout_method: builder.payout_method || 'stripe_connect',
    solana_wallet_address: builder.solana_wallet_address || '',
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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');

    try {
      await base44.entities.Builder.delete(builder.id);
      setSuccess('Account deleted successfully');
      setTimeout(() => {
        base44.auth.logout();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to delete account');
      setDeleting(false);
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

      {/* Payment Information */}
       <div className="border-t border-gray-200 pt-6">
         <h4 className="font-bold text-gray-900 mb-4">Payment Information</h4>

         <div className="space-y-2 mb-4">
           <label className="block text-sm font-medium text-gray-700">Payout Method</label>
           <Select
             value={formData.payout_method}
             onValueChange={(v) => setFormData((prev) => ({ ...prev, payout_method: v }))}
             disabled={savingPayout}
           >
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="stripe_connect">Stripe Connect</SelectItem>
               <SelectItem value="solana">$DUC (Solana)</SelectItem>
               <SelectItem value="manual">Manual</SelectItem>
             </SelectContent>
           </Select>
           <p className="text-xs text-gray-500">
             Choose how you want to receive payouts for chip sales.
           </p>
         </div>

         {formData.payout_method === 'solana' && (
           <div className="space-y-2 mb-4">
             <label className="block text-sm font-medium text-gray-700">
               Solana Wallet Address
             </label>
             <SolanaWalletInput
               value={formData.solana_wallet_address}
               onChange={(v) => setFormData((prev) => ({ ...prev, solana_wallet_address: v }))}
               disabled={savingPayout}
               placeholder="Solana wallet address for $DUC payouts"
             />
             <p className="text-xs text-gray-500">
               $DUC payouts will be sent to this Solana wallet.
             </p>
           </div>
         )}

         {formData.payout_method === 'stripe_connect' && (
           builder.stripe_connected && builder.payout_enabled ? (
             <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
               <p className="text-green-800 font-medium">✓ Stripe Connected</p>
               <p className="text-sm text-green-700 mt-1">
                 Payouts are enabled. Stripe ID: {builder.stripe_connect_id}
               </p>
             </div>
           ) : (
             <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
               <p className="text-yellow-800 font-medium">
                 {builder.stripe_connect_id ? 'Stripe Onboarding Incomplete' : 'Stripe Not Connected'}
               </p>
               <p className="text-sm text-yellow-700">
                 {builder.stripe_connect_id
                   ? 'Finish your Stripe onboarding to enable payouts.'
                   : 'Connect your Stripe account to receive payouts for chip sales.'}
               </p>
               <Button
                 size="sm"
                 className="bg-yellow-600 hover:bg-yellow-700"
                 onClick={handleConnectStripe}
                 disabled={connecting}
               >
                 {connecting ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Connecting...
                   </>
                 ) : builder.stripe_connect_id ? (
                   'Complete Stripe Setup'
                 ) : (
                   'Connect Stripe'
                 )}
               </Button>
             </div>
           )
         )}

         <div className="mt-4">
           <Button
             size="sm"
             onClick={handleSavePayout}
             disabled={savingPayout}
             className="bg-blue-600 hover:bg-blue-700"
           >
             {savingPayout ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Saving...
               </>
             ) : (
               'Save Payout Settings'
             )}
           </Button>
         </div>
       </div>

       {/* Delete Account Section */}
       <div className="border-t border-gray-200 pt-6">
         <h4 className="font-bold text-gray-900 mb-4">Danger Zone</h4>
         <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
           <p className="text-sm text-red-700">
             Deleting your account is permanent and cannot be undone. All your builder data and listings will be removed.
           </p>
           <Button
             variant="destructive"
             size="sm"
             onClick={() => setShowDeleteConfirm(true)}
             disabled={deleting}
             className="w-full"
           >
             <Trash2 className="w-4 h-4 mr-2" />
             Delete Account
           </Button>
         </div>
       </div>

       {/* Delete Confirmation Dialog */}
       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Account</AlertDialogTitle>
             <AlertDialogDescription>
               This will permanently delete your builder account and all associated data. This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <div className="flex gap-3">
             <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
             <AlertDialogAction
               onClick={handleDeleteAccount}
               disabled={deleting}
               className="bg-red-600 hover:bg-red-700"
             >
               {deleting ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Deleting...
                 </>
               ) : (
                 'Delete Account'
               )}
             </AlertDialogAction>
           </div>
         </AlertDialogContent>
       </AlertDialog>
      </CardContent>
      );
      }