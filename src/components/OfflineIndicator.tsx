import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useI18n } from '../i18n';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-[#1e1333]/90 border border-amber-500/60 px-4 py-2 text-xs font-medium text-amber-300 shadow-2xl backdrop-blur-md animate-pulse font-rajdhani"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>{t('offlineNotice')}</span>
    </div>
  );
};
