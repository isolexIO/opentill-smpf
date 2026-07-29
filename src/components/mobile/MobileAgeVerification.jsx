import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export default function MobileAgeVerification({ isOpen, onClose, onVerify, restrictedItems, requiredAge }) {
  const [age, setAge] = useState('');

  const handleVerify = () => {
    const verifiedAge = parseInt(age);
    if (!verifiedAge || verifiedAge < 1) return;
    onVerify({
      verified: verifiedAge >= requiredAge,
      verification_method: 'manual_entry',
      verified_age: verifiedAge,
    });
    setAge('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" /> Age Verification Required
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm font-medium text-orange-800 mb-1">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Minimum age: {requiredAge} years
            </p>
            <div className="space-y-1">
              {restrictedItems.map((item, i) => (
                <p key={i} className="text-xs text-orange-700">
                  • {item.name} (min {item.minimum_age || 21})
                </p>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Customer's Age</label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter age"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={!parseInt(age)}>
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}