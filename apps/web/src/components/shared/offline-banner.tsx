'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const t = useTranslations('common');

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowBanner(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
        showBanner
          ? 'translate-y-0 bg-destructive text-destructive-foreground'
          : 'translate-y-0 bg-green-600 text-white'
      }`}
    >
      {showBanner ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>{t('offlineBanner')}</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 shrink-0" />
          <span>{t('backOnline')}</span>
        </>
      )}
    </div>
  );
}
