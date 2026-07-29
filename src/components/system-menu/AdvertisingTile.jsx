import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdvertisingTile({ targetLocation = 'system_menu' }) {
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAds();
  }, [targetLocation]);

  const loadAds = async () => {
    try {
      console.log('Loading ads for target location:', targetLocation);
      
      // Filter ads by target location
      const allAds = await base44.entities.Advertisement.filter({
        is_active: true,
        target_location: { $in: [targetLocation, 'both'] }
      }, 'display_order');

      console.log('Loaded ads:', allAds.length);

      // Filter by schedule if applicable
      const now = new Date();
      const activeAds = allAds.filter(ad => {
        if (ad.schedule_start && new Date(ad.schedule_start) > now) return false;
        if (ad.schedule_end && new Date(ad.schedule_end) < now) return false;
        return true;
      });

      console.log('Active ads after filtering:', activeAds.length);
      setAds(activeAds);
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ads.length === 0) return;

    const currentAd = ads[currentIndex];
    const duration = (currentAd?.duration_seconds || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, duration);

    // Increment view count
    if (currentAd?.id) {
      base44.entities.Advertisement.update(currentAd.id, {
        view_count: (currentAd.view_count || 0) + 1
      }).catch(err => console.error('Error updating view count:', err));
    }

    return () => clearTimeout(timer);
  }, [currentIndex, ads]);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="w-full aspect-video bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center p-8 text-white text-center">
        <div>
          <h3 className="text-2xl font-bold mb-2">Welcome to openTILL POS</h3>
          <p className="text-white/80">Your modern point of sale solution</p>
        </div>
      </div>
    );
  }

  const currentAd = ads[currentIndex];

  const handleClick = async () => {
    if (currentAd.link_url) {
      // Increment click count
      try {
        await base44.entities.Advertisement.update(currentAd.id, {
          click_count: (currentAd.click_count || 0) + 1
        });
      } catch (err) {
        console.error('Error updating click count:', err);
      }
      window.open(currentAd.link_url, '_blank');
    }
  };

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full"
          onClick={handleClick}
          style={{ cursor: currentAd.link_url ? 'pointer' : 'default' }}
        >
          {currentAd.type === 'image' && (
            <img
              src={currentAd.content_url}
              alt={currentAd.title}
              className="w-full h-full object-cover"
            />
          )}

          {currentAd.type === 'video' && (
            <video
              src={currentAd.content_url}
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
            />
          )}

          {currentAd.type === 'html' && (
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: currentAd.content_url }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress indicator */}
      {ads.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {ads.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-8' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}