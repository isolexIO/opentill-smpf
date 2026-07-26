import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  const token = urlParams.get('token');
  const exp = urlParams.get('exp');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validLink = Boolean(email && token && exp);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('completePasswordReset', {
        email, token, exp, new_password: newPassword
      });
      if (res.data?.success) {
        toast({ title: 'Password updated', description: 'You can now log in with your new password.' });
        navigate(createPageUrl('EmailLogin'));
      } else {
        setError(res.data?.error || 'Failed to reset password.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (!validLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>This password reset link is missing required information or has already been used.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate(createPageUrl('EmailLogin'))}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Set a New Password</CardTitle>
          <CardDescription>Choose a new password for your openTILL account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}