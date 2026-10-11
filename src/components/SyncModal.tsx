import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Smartphone,
  Laptop,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import {
  exportAllDataAsJSON,
  importAllDataFromJSON,
  loadStoredData,
  STORAGE_KEY_PLAYER,
  INITIAL_PLAYER_STATS,
  STORAGE_KEY_QUESTS,
  INITIAL_QUESTS,
  STORAGE_KEY_SKILLS,
  INITIAL_SKILL_NODES,
  STORAGE_KEY_HISTORY,
  generateInitialHistory,
  STORAGE_KEY_LOGS,
  INITIAL_SYSTEM_LOGS,
} from '../utils/storage';
import { soundManager } from '../utils/audio';
import { SoundEvent } from '../types';
import { useI18n } from '../i18n';
import { authService, AuthState } from '../services/authService';
import { cloudSync, CloudSyncInfo } from '../services/cloudSync';
import { stateAuthority } from '../domain';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReloaded: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, onDataReloaded }) => {
  const { t, isRTL } = useI18n();
  const [authState, setAuthState] = useState<AuthState>(() => authService.getState());
  const [syncInfo, setSyncInfo] = useState<CloudSyncInfo>(() => cloudSync.getInfo());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubAuth = authService.subscribe(setAuthState);
    const unsubSync = cloudSync.subscribe(setSyncInfo);
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    setStatusMessage(null);
    const result = await authService.signInWithGoogle();
    if (result.success) {
      soundManager.playSound(SoundEvent.QUEST_COMPLETE);
      setStatusMessage({
        type: 'success',
        text: 'Successfully linked Google Account. Local progression synchronized to Firestore!',
      });
      onDataReloaded();
    } else {
      soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
      setStatusMessage({
        type: 'error',
        text: result.error || 'Failed to authenticate with Google.',
      });
    }
  };

  const handleGoogleSignOut = async () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    await authService.signOut();
    setStatusMessage({
      type: 'success',
      text: 'Signed out of cloud profile. Switched safely to local partition.',
    });
    onDataReloaded();
  };

  const handleManualCloudSync = async () => {
    if (!authState.user) return;
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    setIsManualSyncing(true);
    setStatusMessage(null);

    const success = await cloudSync.pushToFirestore(authState.user.uid, stateAuthority.getState());
    setIsManualSyncing(false);

    if (success) {
      soundManager.playSound(SoundEvent.QUEST_COMPLETE);
      setStatusMessage({
        type: 'success',
        text: 'State synchronized with Firestore cloud profile successfully!',
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: syncInfo.errorMessage || 'Failed to push updates to Firestore.',
      });
    }
  };

  const handleExportJSON = () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    const jsonString = exportAllDataAsJSON();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solo-leveling-system-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ type: 'success', text: 'System state downloaded successfully.' });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importAllDataFromJSON(content);
        if (success) {
          soundManager.playSound(SoundEvent.QUEST_COMPLETE);
          setStatusMessage({ type: 'success', text: 'System state imported successfully!' });
          onDataReloaded();
        } else {
          setStatusMessage({ type: 'error', text: 'Invalid JSON format or corrupted state file.' });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset system data to initial Solo Leveling hunter state?')) {
      soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
      stateAuthority.factoryReset();
      onDataReloaded();
      setStatusMessage({ type: 'success', text: 'Reset to default hunter parameters.' });
    }
  };

  const isSyncing = syncInfo.status === 'syncing' || isManualSyncing;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
            onClose();
          }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Sync Hologram Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative z-10 w-full max-w-lg bg-[#0d0b14]/95 border border-purple-500/30 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/80 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h2 className="text-sm sm:text-base font-bold text-white font-cinzel tracking-wider">
                  {t('cloudSync')}
                </h2>
                <p className="text-[11px] text-purple-300/60 font-orbitron">
                  {t('syncSubtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                onClose();
              }}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Message alert if any */}
          {statusMessage && (
            <div
              className={`mb-4 p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-rajdhani font-semibold ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* SECTION 1: PRIMARY FIRESTORE CLOUD SYNC & GOOGLE AUTH */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-black/40 to-purple-900/10 border border-purple-500/30 mb-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase font-orbitron tracking-wider text-purple-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                {authState.isCloudLinked ? t('googleAccountLinked') : t('googleAccountGuest')}
              </span>

              {/* Real-time Status Badge */}
              {authState.isCloudLinked && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-orbitron font-bold uppercase border border-white/10 bg-black/40">
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                      <span className="text-cyan-300">{t('syncing')}</span>
                    </>
                  ) : !syncInfo.isOnline ? (
                    <>
                      <CloudOff className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-300">Offline</span>
                    </>
                  ) : syncInfo.status === 'error' ? (
                    <>
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      <span className="text-rose-300">Error</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-300">Synced</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {authState.isCloudLinked ? (
              /* Signed-in Account Panel */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    {authState.user?.photoURL ? (
                      <img
                        src={authState.user.photoURL}
                        alt="Hunter"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full border border-purple-400/50 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300 font-black font-cinzel">
                        {authState.user?.displayName?.charAt(0) || 'H'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-white font-rajdhani">
                        {authState.user?.displayName || 'Awakened Hunter'}
                      </p>
                      <p className="text-[10px] text-white/50 font-mono">
                        {authState.user?.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleSignOut}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-950/40 text-white/60 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer"
                    title={t('signOut')}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* PC ↔ Android Phone Indicator */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-rajdhani text-purple-200">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400">↔</span>
                    <Smartphone className="w-4 h-4 text-purple-400" />
                    <span>{t('syncedAcrossDevices')}</span>
                  </div>
                  {syncInfo.lastSyncedAt && (
                    <span className="text-[10px] text-purple-300/60 font-mono">
                      {new Date(syncInfo.lastSyncedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                {/* Manual Sync Trigger */}
                <div className="flex gap-2 pt-1">
                  <button
                    id="btn-trigger-cloud-sync"
                    disabled={isSyncing}
                    onClick={handleManualCloudSync}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-orbitron uppercase tracking-wider shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? t('syncing') : t('syncNow')}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Not Signed In: One-Click Google Sign In */
              <div className="space-y-3">
                <p className="text-xs text-white/70 leading-relaxed font-rajdhani">
                  {t('cloudLinkedNotice')}
                </p>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 font-rajdhani">
                  {t('localDataPreservedNotice')}
                </div>

                <button
                  id="btn-google-sign-in"
                  onClick={handleGoogleSignIn}
                  disabled={authState.loading}
                  className="w-full py-3 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs font-orbitron uppercase tracking-wider shadow-lg flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t('signInWithGoogle')}</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: LOCAL JSON BACKUP (MANUAL SAFEGUARD) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
            <h3 className="text-xs font-bold text-purple-300 uppercase font-orbitron flex items-center gap-1.5 mb-1.5">
              <Database className="w-3.5 h-3.5 text-purple-400" /> {t('localJsonBackup')}
            </h3>
            <p className="text-xs text-white/60 mb-3 leading-relaxed">
              {t('localBackupDesc')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold font-orbitron uppercase tracking-wider transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> {t('exportJson')}
              </button>

              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-xs font-semibold font-orbitron uppercase tracking-wider cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5 text-purple-400" /> {t('importJson')}
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </div>
          </div>

          {/* Footer Reset & Close */}
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <button
              onClick={handleResetDefaults}
              className="text-[11px] text-red-400/80 hover:text-red-300 font-rajdhani flex items-center gap-1 cursor-pointer font-semibold"
            >
              <RotateCcw className="w-3 h-3" /> {t('resetSystemData')}
            </button>

            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-orbitron uppercase tracking-wider border border-white/10 cursor-pointer"
            >
              {t('done')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
