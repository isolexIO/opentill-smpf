import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Mail, Phone, MapPin, CheckCircle, XCircle, UserPlus, Loader2, AlertCircle } from 'lucide-react';

export default function PendingMerchants() {
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [pin, setPin] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [activationError, setActivationError] = useState('');
  const queryClient = useQueryClient();

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ['pending-merchants'],
    queryFn: async () => {
      // Get all inactive merchants (pending activation)
      const allMerchants = await base44.entities.Merchant.filter({ status: 'inactive' });
      return allMerchants;
    },
  });

  const generateCredentials = () => {
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
    const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    setPin(generatedPin);
    setTempPassword(generatedPassword);
  };

  const handleActivate = async () => {
    if (!selectedMerchant || !pin || !tempPassword) {
      setActivationError('Please generate credentials first');
      return;
    }

    setInviting(true);
    setActivationError('');
    
    try {
      // Step 1: Activate merchant and set trial period (Super Admin only)
      await base44.asServiceRole.entities.Merchant.update(selectedMerchant.id, {
        status: 'trial',
        activated_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Step 2: Create admin user via backend function
      const { data } = await base44.functions.invoke('createMerchantAccount', {
        merchant_id: selectedMerchant.id,
        owner_email: selectedMerchant.owner_email,
        owner_name: selectedMerchant.owner_name,
        dealer_id: selectedMerchant.dealer_id || null,
        pin: pin,
        temp_password: tempPassword,
        activate: true
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to create merchant account');
      }

      // Step 3: Set up demo data if requested
      if (selectedMerchant.settings?.demo_data_requested) {
        try {
          await base44.functions.invoke('setupDemoMenu', {
            merchant_id: selectedMerchant.id
          });
        } catch (demoError) {
          console.warn('Demo setup failed:', demoError);
        }
      }

      // Step 4: Send activation email
      try {
        await base44.functions.invoke('sendEmail', {
          to: selectedMerchant.owner_email,
          subject: 'ChainLINK POS - Your Account is Ready!',
          body: `
Great news, ${selectedMerchant.owner_name}!

Your ChainLINK POS account has been activated and is ready to use.

Your Login Credentials:
Email: ${selectedMerchant.owner_email}
PIN: ${pin}
Temporary Password: ${tempPassword}

You can now log in at ${window.location.origin}/PinLogin using your 6-digit PIN for quick access.

Your 30-day free trial has started!

Best regards,
ChainLINK POS Team
          `
        });
      } catch (emailError) {
        console.warn('Email failed, but user was created successfully:', emailError);
      }

      alert(`✅ Account activated successfully!\n\nMerchant: ${selectedMerchant.business_name}\nStatus: Trial (30 days)\nAdmin user created for: ${selectedMerchant.owner_email}\n\nCredentials:\nPIN: ${pin}\nPassword: ${tempPassword}\n\n${selectedMerchant.settings?.demo_data_requested ? 'Demo data has been set up.\n\n' : ''}An activation email has been sent.`);
      
      queryClient.invalidateQueries({ queryKey: ['pending-merchants'] });
      setSelectedMerchant(null);
      setPin('');
      setTempPassword('');
      setActivationError('');
    } catch (error) {
      console.error('Failed to activate merchant:', error);
      setActivationError(error.message || 'Failed to activate merchant account');
    } finally {
      setInviting(false);
    }
  };

  const handleReject = async (merchant) => {
    if (!confirm(`Reject registration for ${merchant.business_name}?`)) {
      return;
    }

    try {
      await base44.asServiceRole.entities.Merchant.update(merchant.id, { 
        status: 'cancelled',
        suspended_at: new Date().toISOString(),
        suspension_reason: 'Registration rejected by admin'
      });
      
      // Send rejection email
      try {
        await base44.functions.invoke('sendEmail', {
          to: merchant.owner_email,
          subject: 'ChainLINK POS - Registration Update',
          body: `
Hello ${merchant.owner_name},

Thank you for your interest in ChainLINK POS.

Unfortunately, we are unable to approve your merchant registration at this time.

If you have any questions, please contact our support team.

Best regards,
ChainLINK POS Team
          `
        });
      } catch (emailError) {
        console.warn('Rejection email failed:', emailError);
      }
      
      queryClient.invalidateQueries({ queryKey: ['pending-merchants'] });
    } catch (error) {
      console.error('Failed to reject merchant:', error);
      alert('Failed to reject registration');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Merchant Registrations</h2>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {merchants.length} Pending
        </Badge>
      </div>

      {merchants.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No pending merchant registrations</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {merchants.map((merchant) => (
            <Card key={merchant.id} className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="dark:text-white">{merchant.business_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      Registered {new Date(merchant.created_date).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Pending Activation</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">{merchant.owner_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">{merchant.owner_email}</span>
                  </div>
                  {merchant.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">{merchant.phone}</span>
                    </div>
                  )}
                  {merchant.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">{merchant.address}</span>
                    </div>
                  )}
                </div>
                {merchant.settings?.demo_data_requested && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">Demo Data Requested</Badge>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(merchant)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedMerchant(merchant);
                      generateCredentials();
                      setActivationError('');
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Activate Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedMerchant} onOpenChange={() => {
        setSelectedMerchant(null);
        setPin('');
        setTempPassword('');
        setActivationError('');
      }}>
        <DialogContent className="dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Activate Merchant Account</DialogTitle>
          </DialogHeader>
          
          {selectedMerchant && (
            <div className="space-y-4 py-4">
              {activationError && (
                <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-800 dark:text-red-300">{activationError}</AlertDescription>
                </Alert>
              )}

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Activating: <strong className="text-gray-900 dark:text-white">{selectedMerchant.business_name}</strong>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Admin account will be created for: <strong className="text-gray-900 dark:text-white">{selectedMerchant.owner_email}</strong>
                </p>
                {selectedMerchant.settings?.demo_data_requested && (
                  <Badge className="bg-blue-100 text-blue-800">Demo data will be set up</Badge>
                )}
              </div>

              <div className="space-y-3 bg-blue-50 dark:bg-gray-700 p-4 rounded-lg">
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Generated PIN</Label>
                  <Input value={pin} readOnly className="font-mono text-lg font-bold mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Generated Password</Label>
                  <Input value={tempPassword} readOnly className="font-mono text-sm mt-1" />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generateCredentials}
                  className="w-full"
                >
                  Regenerate Credentials
                </Button>
              </div>

              <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-300">
                  This will create an admin user account and send activation email with credentials.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedMerchant(null);
                setPin('');
                setTempPassword('');
                setActivationError('');
              }}
              disabled={inviting}
            >
              Cancel
            </Button>
            <Button onClick={handleActivate} disabled={inviting || !pin || !tempPassword}>
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate & Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}