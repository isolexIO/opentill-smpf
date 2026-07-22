import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, ChefHat } from 'lucide-react';

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [merchantId, setMerchantId] = useState(null);
  const [error, setError] = useState(null); // Added for error handling
  const [deviceSessionId, setDeviceSessionId] = useState(null);
  const [stationInfo, setStationInfo] = useState(null);
  const [stationId, setStationId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadMerchantId();
  }, []);

  useEffect(() => {
    if (!merchantId) return;
    if (error) return; // Don't load orders if there's an initialization error

    // Initial load
    loadOrders();

    // Poll for updates every 5 seconds
    // In production, this would be WebSocket-based
    const interval = setInterval(loadOrders, 5000);

    return () => clearInterval(interval);
  }, [merchantId, stationId, error, deviceSessionId]); // Re-run effect if merchantId/stationId changes or error state changes

  // Device Session Registration and Heartbeat
  useEffect(() => {
    if (!merchantId) return;

    let currentSessionId = null; // Use a local variable to capture the ID for cleanup

    const registerSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const stationId = urlParams.get('station_id');

        const { data } = await base44.functions.invoke('registerDeviceSession', {
          merchant_id: merchantId,
          device_name: 'Kitchen Display',
          device_type: 'kitchen_display',
          station_id: stationId || null,
          metadata: {
            browser: navigator.userAgent,
            screen_resolution: `${window.screen.width}x${window.screen.height}`
          }
        });

        if (data?.session_id) {
          currentSessionId = data.session_id;
          setDeviceSessionId(currentSessionId);
          console.log('Kitchen Display: Device session registered:', currentSessionId);
        }
      } catch (error) {
        console.error('Kitchen Display: Error registering device session:', error);
      }
    };

    const sendHeartbeat = async () => {
      if (!currentSessionId) return; // Use the local variable

      try {
        const { data } = await base44.functions.invoke('updateDeviceHeartbeat', {
          session_id: currentSessionId, // Use the local variable
          status: orders.length > 0 ? 'online' : 'idle',
          metadata: {
            active_orders_count: orders.length,
            pending_orders: orders.filter(o => o.status === 'pending').length,
            processing_orders: orders.filter(o => o.status === 'processing').length
          }
        });

        // Check if session was force-disconnected
        if (data?.forced_disconnect) {
          console.log('Kitchen Display: Session was force-disconnected by admin');
          setError('This display was disconnected by an administrator');
        }
      } catch (error) {
        console.error('Kitchen Display: Error sending heartbeat:', error);
      }
    };

    // Register session immediately
    registerSession();

    // Send heartbeat every 10 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 10000);

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      
      if (currentSessionId) { // Use the local variable
        base44.functions.invoke('disconnectDeviceSession', { 
          session_id: currentSessionId 
        }).catch(err => console.error('Kitchen Display: Error disconnecting session:', err));
      }
    };
  }, [merchantId, orders.length]); // orders.length added to re-run effect to update heartbeat metadata if orders change

  const loadMerchantId = async () => {
    try {
      let foundMerchantId = null;

      // First try URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      foundMerchantId = urlParams.get('merchant_id');
      
      console.log('Kitchen Display - merchant_id from URL:', foundMerchantId);
      
      // If not in URL, try localStorage
      if (!foundMerchantId) {
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        if (pinUserJSON) {
          try {
            const pinUser = JSON.parse(pinUserJSON);
            foundMerchantId = pinUser.merchant_id;
            console.log('Kitchen Display - merchant_id from localStorage:', foundMerchantId);
          } catch (e) {
            console.error('Error parsing pinUser from localStorage:', e);
          }
        }
      }
      
      // If still not found, try authenticated user
      if (!foundMerchantId) {
        try {
          const user = await base44.auth.me();
          foundMerchantId = user.merchant_id;
          console.log('Kitchen Display - merchant_id from auth:', foundMerchantId);
        } catch (e) {
          console.error('Could not get authenticated user:', e);
        }
      }
      
      if (!foundMerchantId) {
        console.error('Kitchen Display - No merchant_id found');
        setError('Unable to load merchant ID. Please open from POS system.');
      } else {
        console.log('Kitchen Display - Using merchant_id:', foundMerchantId);
        setMerchantId(foundMerchantId);
        setError(null); // Clear any previous error

        // Load station info if a station_id was provided in the URL
        const stationIdFromUrl = new URLSearchParams(window.location.search).get('station_id');
        if (stationIdFromUrl) {
          setStationId(stationIdFromUrl);
          try {
            const stations = await base44.entities.Station.filter({ merchant_id: foundMerchantId, station_id: stationIdFromUrl });
            if (stations && stations.length > 0) setStationInfo(stations[0]);
          } catch (e) {
            console.warn('Kitchen Display: Could not load station info', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading merchant ID:', error);
      setError('Failed to initialize kitchen display');
    }
  };

  const loadOrders = async () => {
    if (!merchantId) return;

    try {
      const { data } = await base44.functions.invoke('getDisplayOrders', {
        merchant_id: merchantId,
        session_id: deviceSessionId,
        station_id: stationId || null,
        mode: 'kitchen'
      });
      const orderList = data?.success ? (data.orders || []) : [];

      // Check for new orders
      if (orderList.length > orders.length) {
        playNotificationSound();
      }

      setOrders(orderList);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const action = newStatus === 'processing' ? 'kitchen_start' : 'kitchen_complete';
      await base44.functions.invoke('updateDisplayOrder', {
        order_id: orderId,
        merchant_id: merchantId,
        session_id: deviceSessionId,
        action
      });
      await loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const getStatusColor = (order) => {
    const age = Date.now() - new Date(order.created_date).getTime();
    const minutes = age / 60000;

    if (order.status === 'completed') return 'bg-gray-100';
    if (minutes > 15) return 'bg-red-100 border-red-400';
    if (minutes > 10) return 'bg-orange-100 border-orange-400';
    if (order.status === 'processing') return 'bg-blue-100 border-blue-400';
    return 'bg-white';
  };

  const getOrderAge = (createdDate) => {
    const age = Date.now() - new Date(createdDate).getTime();
    const minutes = Math.floor(age / 60000);
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Audio for notifications */}
      <audio ref={audioRef}>
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+D2vWcdBjWH0fPTgC4GI3nA7+GQRQ0PVqzk8K9mHQU2jdX1yXklBz+CQAAEBAEAAQA==" />
      </audio>

      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Kitchen Display{stationInfo ? ` · ${stationInfo.name}` : ''}
              </h1>
              <p className="text-gray-400">Active Orders: {orders.length}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white">
              {new Date().toLocaleTimeString()}
            </div>
            <div className="text-gray-400">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-100 border-red-400 text-red-700 p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Orders Grid */}
      {!merchantId ? (
        <Card className="p-12 text-center bg-gray-50">
          <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700">Loading Configuration...</h2>
          <p className="text-gray-500 mt-2">Attempting to retrieve merchant ID.</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700">All Caught Up!</h2>
          <p className="text-gray-500 mt-2">No pending orders at the moment</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(orders || []).map((order) => (
            <Card key={order.id} className={`${getStatusColor(order)} border-2`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">#{order.order_number}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.status === 'processing' ? 'default' : 'secondary'}>
                      {order.status === 'processing' ? 'In Progress' : 'New'}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="w-4 h-4" />
                      {getOrderAge(order.created_date)}
                    </div>
                  </div>
                </div>
                {order.table_number && (
                  <div className="text-sm font-semibold text-gray-600">
                    Table {order.table_number}
                  </div>
                )}
                {order.customer_name && (
                  <div className="text-sm text-gray-600">
                    {order.customer_name}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {(order.items || []).map((item, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                      <div className="font-semibold text-lg">
                        {item.quantity}x {item.product_name}
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          {(item.modifiers || []).map((mod, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {mod.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {order.special_instructions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
                    <div className="text-xs font-semibold text-yellow-800 mb-1">
                      Special Instructions:
                    </div>
                    <div className="text-sm text-yellow-900">
                      {order.special_instructions}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'processing')}
                      className="flex-1"
                      variant="outline"
                    >
                      Start
                    </Button>
                  )}
                  {order.status === 'processing' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}