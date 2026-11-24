import React, { useState, useEffect } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  if (isInstalled || !isInstallable) return null;

  return (
    <button
      type="button"
      onClick={promptInstall}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#191012] border border-[#FF1822]/60 text-white text-xs font-semibold hover:bg-[#E50914] transition-colors cursor-pointer whitespace-nowrap min-h-[36px]"
    >
      <Download className="w-3.5 h-3.5 text-[#FF252E]" />
      <span>Install App</span>
    </button>
  );
}

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 w-full bg-amber-500 text-black text-xs font-bold px-4 py-2 flex items-center justify-center gap-2"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>You are offline — Cached tickets & QR passes remain viewable; live bookings will resume when reconnected.</span>
    </div>
  );
}
