import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function WelcomeScreen({ merchant }) {
  const [ads, setAds] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAds();
  }, []);

  useEffect(() => {
    if (ads.length > 0) {
      const currentAd = ads[currentAdIndex];
      const duration = (currentAd?.duration_seconds || 10) * 1000;

      const timer = setTimeout(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [currentAdIndex, ads]);

  const loadAds = async () => {
    try {
      console.log('WelcomeScreen: Loading advertisements...');
      
      const allAds = await base44.entities.Advertisement.list();
      
      // Filter active ads for system_menu or both
      const activeAds = allAds.filter(ad => 
        ad.is_active && 
        (ad.target_location === 'system_menu' || ad.target_location === 'both') &&
        (!ad.schedule_start || new Date(ad.schedule_start) <= new Date()) &&
        (!ad.schedule_end || new Date(ad.schedule_end) >= new Date())
      );

      // Sort by display_order
      activeAds.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      console.log('WelcomeScreen: Found', activeAds.length, 'active ads');
      setAds(activeAds);
      setLoading(false);

      // Increment view counts
      if (activeAds.length > 0) {
        for (const ad of activeAds) {
          try {
            await base44.entities.Advertisement.update(ad.id, {
              view_count: (ad.view_count || 0) + 1
            });
          } catch (e) {
            // Ignore errors updating view count
          }
        }
      }
    } catch (error) {
      console.error('WelcomeScreen: Error loading ads:', error);
      setLoading(false);
    }
  };

  const currentAd = ads[currentAdIndex];
  const primaryColor = merchant?.settings?.solana_pay?.enabled 
    ? '#10b981' 
    : (merchant?.settings?.blockchain?.enabled ? '#7B2FD6' : '#3B82F6');

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ background: `${primaryColor}20` }}
        ></div>
        <div 
          className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ background: `${primaryColor}15`, animationDelay: '1s' }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl">
        {/* Logo or Business Name */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-7xl font-bold mb-4" style={{ color: primaryColor }}>
            {merchant?.business_name || 'Welcome'}
          </h1>
          <p className="text-3xl text-gray-600">
            Please wait while your order is being prepared
          </p>
        </motion.div>

        {/* Advertisement Display */}
        <div className="w-full max-w-3xl mx-auto mb-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-gray-500"
              >
                Loading...
              </motion.div>
            ) : ads.length > 0 && currentAd ? (
              <motion.div
                key={currentAd.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={async () => {
                  if (currentAd.link_url) {
                    try {
                      await base44.entities.Advertisement.update(currentAd.id, {
                        click_count: (currentAd.click_count || 0) + 1
                      });
                      window.open(currentAd.link_url, '_blank');
                    } catch (e) {
                      // Ignore errors
                    }
                  }
                }}
                style={{ cursor: currentAd.link_url ? 'pointer' : 'default' }}
              >
                {currentAd.type === 'image' && (
                  <img
                    src={currentAd.content_url}
                    alt={currentAd.title}
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                )}
                {currentAd.type === 'video' && (
                  <video
                    src={currentAd.content_url}
                    autoPlay
                    loop
                    muted
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                )}
                {currentAd.type === 'html' && (
                  <iframe
                    srcDoc={currentAd.content_url}
                    sandbox=""
                    title={currentAd.title || 'Advertisement'}
                    className="w-full h-[500px] border-0 bg-white"
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="no-ads"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-gray-400 text-xl"
              >
                {/* Empty state - show nothing or default message */}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ad indicator dots */}
          {ads.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {ads.map((_, index) => (
                <div
                  key={index}
                  className={`h-3 w-3 rounded-full transition-all ${
                    index === currentAdIndex
                      ? 'w-8'
                      : 'opacity-50'
                  }`}
                  style={{ 
                    backgroundColor: index === currentAdIndex ? primaryColor : '#9CA3AF'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer message */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl text-gray-500 mt-8"
        >
          Your cashier will assist you shortly
        </motion.p>
      </div>
    </div>
  );
}