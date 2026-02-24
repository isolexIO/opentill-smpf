import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;

    if (distance > 0) {
      setPullDistance(Math.min(distance, PULL_THRESHOLD * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    setPulling(false);

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pulling, pullDistance, isRefreshing]);

  return (
    <div ref={containerRef} className="overflow-y-auto">
      {/* Pull indicator */}
      {(pulling || isRefreshing) && (
        <div
          className="flex justify-center items-center bg-gray-100 dark:bg-gray-800 overflow-hidden transition-all"
          style={{ height: `${pullDistance}px` }}
        >
          {isRefreshing ? (
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          ) : (
            <RefreshCw
              className="w-5 h-5 text-gray-400 transition-transform"
              style={{
                transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)`,
              }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}