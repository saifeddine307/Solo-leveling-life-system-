import React, { useState } from 'react';
import { Download, Monitor, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useI18n } from '../i18n';
import { soundManager } from '../utils/audio';
import { SoundEvent } from '../types';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t, isRTL } = useI18n();

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    soundManager.playSound(SoundEvent.SYSTEM_OPEN);
    await install();
  };

  // Chromium / Desktop Windows / Android / Edge flow
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 hover:text-white text-xs font-bold border border-purple-500/40 hover:border-purple-400 shadow-md shadow-purple-900/30 transition-all hover:scale-105 active:scale-95 cursor-pointer font-orbitron uppercase tracking-wider"
        title={t('installApp')}
      >
        <Download className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
        <span className="hidden md:inline">{t('installApp')}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-ios-install"
          onClick={() => {
            soundManager.playSound(SoundEvent.SYSTEM_OPEN);
            setShowIOSGuide(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 text-purple-300 hover:text-white text-xs font-bold border border-purple-500/30 transition-all cursor-pointer font-orbitron"
          title={t('installApp')}
        >
          <Monitor className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">{t('installApp')}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div
              className={`relative w-full max-w-sm rounded-2xl bg-[#130f24] border border-purple-500/40 p-6 shadow-2xl text-white ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold font-cinzel text-purple-200">
                  {isRTL ? 'تثبيت على الهاتف / الآيباد' : 'Install Standalone App'}
                </h3>
              </div>

              <p className="mt-3 text-xs text-white/70 leading-relaxed font-sans">
                {isRTL ? (
                  <>
                    1. اضغط على زر <strong className="text-purple-300">المشاركة (Share)</strong> في شريط Safari.<br />
                    2. مرر للأسفل واختر <strong className="text-purple-300">إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong>.
                  </>
                ) : (
                  <>
                    1. Tap the <strong className="text-purple-300">Share</strong> button in Safari toolbar.<br />
                    2. Scroll down and tap <strong className="text-purple-300">Add to Home Screen</strong>.
                  </>
                )}
              </p>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold tracking-wider uppercase font-orbitron text-white transition cursor-pointer"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
