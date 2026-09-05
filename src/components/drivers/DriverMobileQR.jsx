import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Loader2 } from 'lucide-react';

/**
 * Renders a button that opens a dialog with a QR code pointing to the
 * Driver Dashboard, so a driver can scan it and open the dashboard on
 * their mobile device.
 */
export default function DriverMobileQR() {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const url = `${window.location.origin}/DriverDashboard`;

  useEffect(() => {
    if (!open || dataUrl) return;
    setLoading(true);
    QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: '#1f2937', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null))
      .finally(() => setLoading(false));
  }, [open, dataUrl]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} title="Open on mobile">
        <Smartphone className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Mobile</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Open on your phone
            </DialogTitle>
            <DialogDescription>
              Scan with your phone camera to open the driver dashboard on your mobile device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            ) : dataUrl ? (
              <img src={dataUrl} alt="Driver dashboard QR code" className="w-56 h-56" />
            ) : (
              <p className="text-sm text-red-500">Could not generate QR code.</p>
            )}
            <p className="text-xs text-gray-500 break-all text-center">{url}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}