import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus, Download, LogOut, Bike, MapPin, PackageCheck, Clock } from 'lucide-react';
import JobCard from '@/components/drivers/JobCard';
import RouteMap from '@/components/drivers/RouteMap';
import CreateDeliveryDialog from '@/components/drivers/CreateDeliveryDialog';

export default function DriverDashboard() {
  const [pinUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pinLoggedInUser') || 'null'); }
    catch { return null; }
  });
  const merchantId = pinUser?.merchant_id;
  const isAdmin = ['admin', 'super_admin', 'root_admin', 'dealer_admin'].includes(pinUser?.role);

  const [jobs, setJobs] = useState([]);
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState('available');

  useEffect(() => {
    if (!pinUser) window.location.href = createPageUrl('PinLogin');
  }, []);

  useEffect(() => {
    if (merchantId) loadAll();
  }, [merchantId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [jobList, merchants] = await Promise.all([
        base44.entities.DeliveryJob.filter({ merchant_id: merchantId }, '-created_date', 200),
        base44.entities.Merchant.filter({ id: merchantId })
      ]);
      setJobs(jobList || []);
      setMerchant(merchants?.[0] || null);
    } catch (e) {
      console.error('Failed to load deliveries', e);
    } finally {
      setLoading(false);
    }
  };

  const available = jobs.filter((j) => j.status === 'available');
  const mine = jobs.filter((j) => j.driver_id === pinUser?.id && (j.status === 'accepted' || j.status === 'picked_up'));
  const history = jobs.filter((j) => j.driver_id === pinUser?.id && j.status === 'delivered');
  const todayCount = history.filter((j) => j.delivered_at && new Date(j.delivered_at).toDateString() === new Date().toDateString()).length;

  const accept = async (job) => {
    setBusy(true);
    try {
      await base44.entities.DeliveryJob.update(job.id, {
        driver_id: pinUser.id,
        driver_name: pinUser.full_name,
        status: 'accepted',
        assigned_at: new Date().toISOString()
      });
      await loadAll();
    } finally { setBusy(false); }
  };

  const pickup = async (job) => {
    setBusy(true);
    try {
      await base44.entities.DeliveryJob.update(job.id, {
        status: 'picked_up',
        picked_up_at: new Date().toISOString()
      });
      await loadAll();
    } finally { setBusy(false); }
  };

  const deliver = async (job) => {
    setBusy(true);
    try {
      await base44.entities.DeliveryJob.update(job.id, {
        status: 'delivered',
        delivered_at: new Date().toISOString()
      });
      if (job.online_order_id) {
        try { await base44.entities.OnlineOrder.update(job.online_order_id, { status: 'completed' }); } catch { /* online order may not be updatable */ }
      }
      await loadAll();
    } finally { setBusy(false); }
  };

  const createJob = async (data) => {
    await base44.entities.DeliveryJob.create({
      ...data,
      merchant_id: merchantId,
      dealer_id: pinUser?.dealer_id,
      status: 'available'
    });
    await loadAll();
  };

  const importReady = async () => {
    setBusy(true);
    try {
      const orders = await base44.entities.OnlineOrder.filter({
        merchant_id: merchantId,
        fulfillment_type: 'delivery',
        status: 'ready'
      });
      const existing = new Set(jobs.map((j) => j.online_order_id).filter(Boolean));
      const toCreate = (orders || []).filter((o) => !existing.has(o.id));
      if (toCreate.length === 0) {
        alert('No new ready delivery orders to import.');
        return;
      }
      const pickupAddress = merchant?.address || 'Store';
      const payload = toCreate.map((o) => ({
        merchant_id: merchantId,
        dealer_id: pinUser?.dealer_id,
        online_order_id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name || '',
        customer_phone: o.customer_phone || '',
        delivery_address: o.delivery_address || '',
        pickup_address: pickupAddress,
        items_summary: (o.items || []).map((i) => `${i.quantity}x ${i.product_name}`).join(', '),
        total: o.total || 0,
        status: 'available',
        notes: o.special_instructions || ''
      }));
      await base44.entities.DeliveryJob.bulkCreate(payload);
      await loadAll();
    } catch (e) {
      console.error('Import failed', e);
      alert('Failed to import orders.');
    } finally { setBusy(false); }
  };

  const logout = () => {
    localStorage.removeItem('pinLoggedInUser');
    window.location.href = createPageUrl('PinLogin');
  };

  if (!pinUser) return null;

  const activeJob = mine[0];
  const defaultPickup = merchant?.address || '';

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="w-6 h-6 text-blue-600" />
            <div>
              <div className="font-bold text-lg leading-none">openTILL Driver</div>
              <div className="text-xs text-gray-500">{pinUser?.full_name} · {pinUser?.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-1" /> New
                </Button>
                <Button size="sm" variant="outline" onClick={importReady} disabled={busy}>
                  <Download className="w-4 h-4 mr-1" /> Import
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Available" value={available.length} icon={Clock} color="text-blue-600" />
          <Stat label="My Active" value={mine.length} icon={PackageCheck} color="text-amber-600" />
          <Stat label="Delivered Today" value={todayCount} icon={PackageCheck} color="text-green-600" />
        </div>

        {activeJob && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Current Route — {activeJob.order_number || 'Delivery'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RouteMap pickup={activeJob.pickup_address} delivery={activeJob.delivery_address} />
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="available">Available ({available.length})</TabsTrigger>
            <TabsTrigger value="active">My Active ({mine.length})</TabsTrigger>
            <TabsTrigger value="history">History ({history.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-3 space-y-3">
            {loading ? <Spinner /> : available.length === 0
              ? <Empty text="No available deliveries" />
              : available.map((j) => <JobCard key={j.id} job={j} isMine={false} onAccept={accept} />)}
          </TabsContent>

          <TabsContent value="active" className="mt-3 space-y-4">
            {mine.length === 0
              ? <Empty text="No active deliveries" />
              : mine.map((j) => (
                <div key={j.id} className="space-y-3">
                  <JobCard job={j} isMine onPickup={pickup} onDeliver={deliver} />
                  <RouteMap pickup={j.pickup_address} delivery={j.delivery_address} />
                </div>
              ))}
          </TabsContent>

          <TabsContent value="history" className="mt-3 space-y-3">
            {history.length === 0
              ? <Empty text="No completed deliveries" />
              : history.map((j) => <JobCard key={j.id} job={j} isMine />)}
          </TabsContent>
        </Tabs>

        {busy && (
          <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      <CreateDeliveryDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={createJob}
        defaultPickup={defaultPickup}
      />
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`w-6 h-6 ${color}`} />
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Spinner() {
  return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
}

function Empty({ text }) {
  return <div className="py-10 text-center text-gray-400 text-sm">{text}</div>;
}