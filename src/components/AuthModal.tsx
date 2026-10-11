import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, LogIn, Users, Shield, Check, Sparkles } from 'lucide-react';
import { UserAccount } from '../types';
import { getRegisteredUsers, registerNewUser, setCurrentUserId } from '../utils/auth';
import { HunterAvatar } from './HunterAvatar';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';
import { authService } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onSwitchUser: (userId: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onSwitchUser,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'switch'>('switch');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const users = getRegisteredUsers();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Hunter codename is required.');
      soundManager.playPenaltyWarning();
      return;
    }
    const userEmail = email.trim() || `${username.toLowerCase().replace(/\s+/g, '')}@solo.hunter`;
    const newUser = registerNewUser(username.trim(), userEmail);
    soundManager.playLevelUp();
    onSwitchUser(newUser.id);
    onClose();
  };

  const handleQuickSwitch = (user: UserAccount) => {
    soundManager.playClick();
    setCurrentUserId(user.id);
    onSwitchUser(user.id);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    soundManager.playClick();
    const res = await authService.signInWithGoogle();
    if (res.success) {
      soundManager.playLevelUp();
      const current = authService.getState();
      if (current.user) {
        onSwitchUser(current.user.uid);
      }
      onClose();
    } else if (res.error) {
      setErrorMsg(res.error);
      soundManager.playPenaltyWarning();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 bg-[#0d0b14]/95 shadow-[0_0_50px_rgba(168,85,247,0.2)]"
        >
          {/* HUD Corner Accents */}
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-sm font-black tracking-wider text-white font-cinzel">
                  {t('hunterAuthTitle')}
                </h3>
                <p className="text-[10px] text-purple-300/60 font-orbitron">
                  {t('hunterAuthSubtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                soundManager.playModalClose();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 mb-6">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('switch');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold font-orbitron cursor-pointer transition-all ${
                activeTab === 'switch'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('switchAccount')}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('register');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold font-orbitron cursor-pointer transition-all ${
                activeTab === 'register'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('registerTab')}</span>
            </button>
          </div>

          {/* Multi-User Switcher View */}
          {activeTab === 'switch' && (
            <div className="space-y-4">
              {/* Google Sign-In Cloud Option */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs font-orbitron uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
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

              <div className="space-y-2">
                <span className="text-[10px] text-white/40 font-orbitron uppercase block">
                  AVAILABLE HUNTER PROFILES ({users.length})
                </span>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isCurrent = u.id === currentUserId;
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleQuickSwitch(u)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-900/20'
                            : 'bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <HunterAvatar avatar={u.avatar} name={u.displayName} size="sm" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white font-cinzel">
                                {u.displayName}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-600 text-[8px] font-black text-white font-orbitron">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-white/40 font-orbitron block">
                              {u.email}
                            </span>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-xs text-purple-400 font-orbitron font-bold opacity-0 group-hover:opacity-100">
                            Switch
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Isolation Notice */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-[11px]">
                <p>{t('isolatedDataNotice')}</p>
              </div>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab('register');
                }}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300 text-xs font-bold font-orbitron transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ {t('registerNewHunter')}</span>
              </button>
            </div>
          )}

          {/* Register New Hunter Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-orbitron">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="text-[10px] text-white/50 font-orbitron uppercase block mb-1.5">
                  {t('usernameLabel')} *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="e.g. Sung Jin-Woo / Shadow Hunter"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-purple-500/60"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-white/50 font-orbitron uppercase block mb-1.5">
                  {t('emailLabel')} (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hunter@system.awakened"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-purple-500/60"
                />
              </div>

              <div>
                <label className="text-[10px] text-white/50 font-orbitron uppercase block mb-1.5">
                  {t('passwordLabel')} (Optional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-purple-500/60"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-orbitron shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t('registerNewHunter')}</span>
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
