import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Globe,
  Palette,
  Volume2,
  VolumeX,
  Users,
  Download,
  Upload,
  Cloud,
  Check,
  Play,
  Share2,
  Sparkles,
  Sliders,
  Clock,
  AlertTriangle,
  Info,
  Shield,
} from 'lucide-react';
import {
  PlayerStats,
  UserSettings,
  AccentColor,
  ThemeMode,
  SoundEvent,
  Achievement,
  SkillNode,
} from '../../types';
import { AVATAR_PRESETS, HunterAvatar } from '../HunterAvatar';
import { soundManager } from '../../utils/audio';
import { useI18n, TranslationDictionary } from '../../i18n';
import { exportAllDataAsJSON, importAllDataFromJSON } from '../../utils/storage';
import { getCurrentUserAccount } from '../../utils/auth';

interface SettingsPageProps {
  player: PlayerStats;
  settings: UserSettings;
  achievements: Achievement[];
  skills: SkillNode[];
  onUpdatePlayer: (updates: Partial<PlayerStats>) => void;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onOpenAuthModal: () => void;
  onOpenPublicProfileModal: () => void;
  onOpenSyncModal: () => void;
  onReplayAwakening?: () => void;
  onFactoryReset?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  player,
  settings,
  achievements: _achievements,
  skills: _skills,
  onUpdatePlayer,
  onUpdateSettings,
  onOpenAuthModal,
  onOpenPublicProfileModal,
  onOpenSyncModal,
  onReplayAwakening,
  onFactoryReset,
}) => {
  const { t, language, setLanguage, isRTL } = useI18n();

  // Local state for editing profile fields
  const [usernameInput, setUsernameInput] = useState(player.name);
  const [titleInput, setTitleInput] = useState(player.title);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);

  const currentUser = getCurrentUserAccount();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    onUpdatePlayer({
      name: usernameInput.trim() || player.name,
      title: titleInput.trim() || player.title,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSelectAvatar = (avatarId: string) => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    onUpdatePlayer({ avatar: avatarId });
  };

  const handleLanguageChange = (newLang: 'en' | 'ar') => {
    soundManager.playSound(SoundEvent.SYSTEM_OPEN);
    setLanguage(newLang);
    onUpdateSettings({ language: newLang, direction: newLang === 'ar' ? 'rtl' : 'ltr' });
  };

  const handleSoundToggle = () => {
    const nextState = !settings.soundEnabled;
    soundManager.setSoundEnabled(nextState);
    onUpdateSettings({ soundEnabled: nextState });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    soundManager.setMasterVolume(vol);
    onUpdateSettings({ soundVolume: vol });
  };

  const handleThemeChange = (theme: ThemeMode) => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    onUpdateSettings({ theme });
  };

  const handleAccentChange = (accentColor: AccentColor) => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    onUpdateSettings({ accentColor });
  };

  const handleExport = () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    const jsonStr = exportAllDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solo-system-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importAllDataFromJSON(content);
        if (success) {
          soundManager.playSound(SoundEvent.LEVEL_UP);
          setImportStatus('Backup state successfully restored. Reloading...');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          soundManager.playSound(SoundEvent.ERROR);
          setImportStatus('Failed to restore backup: Invalid JSON schema.');
        }
      }
    };
    reader.readAsText(file);
  };

  const soundEventList: { event: SoundEvent; labelKey: keyof TranslationDictionary }[] = [
    { event: SoundEvent.SYSTEM_OPEN, labelKey: 'sfxSystemOpen' },
    { event: SoundEvent.SYSTEM_CLOSE, labelKey: 'sfxSystemClose' },
    { event: SoundEvent.QUEST_CREATED, labelKey: 'sfxQuestCreated' },
    { event: SoundEvent.QUEST_COMPLETE, labelKey: 'sfxQuestComplete' },
    { event: SoundEvent.XP_GAIN, labelKey: 'sfxXpGain' },
    { event: SoundEvent.LEVEL_UP, labelKey: 'sfxLevelUp' },
    { event: SoundEvent.RANK_UP, labelKey: 'sfxRankUp' },
    { event: SoundEvent.ACHIEVEMENT_UNLOCK, labelKey: 'sfxAchievementUnlock' },
    { event: SoundEvent.TIMER_START, labelKey: 'sfxTimerStart' },
    { event: SoundEvent.TIMER_PAUSE, labelKey: 'sfxTimerPause' },
    { event: SoundEvent.TIMER_COMPLETE, labelKey: 'sfxTimerComplete' },
    { event: SoundEvent.AI_ACTION, labelKey: 'sfxAiAction' },
    { event: SoundEvent.WARNING, labelKey: 'sfxWarning' },
    { event: SoundEvent.ERROR, labelKey: 'sfxError' },
    { event: SoundEvent.AWAKENING, labelKey: 'sfxAwakening' },
    { event: SoundEvent.BUTTON_CONFIRM, labelKey: 'sfxButtonConfirm' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-4xl mx-auto space-y-6 pb-12"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-wider">
              {t('settingsTitle')}
            </h1>
          </div>
          <p className="text-xs text-purple-300/70 font-orbitron mt-1">
            {t('settingsSubtitle')}
          </p>
        </div>

        {/* Quick Public Profile Link */}
        <button
          onClick={() => {
            soundManager.playSound(SoundEvent.SYSTEM_OPEN);
            onOpenPublicProfileModal();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold font-orbitron transition-all cursor-pointer self-start sm:self-auto"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{t('previewPublicProfile')}</span>
        </button>
      </div>

      {/* ONE MAIN SETTINGS GLASS PANEL */}
      <div className="relative bg-[#110e1f]/85 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-xl shadow-black/70 p-5 sm:p-8 space-y-8 h-auto overflow-hidden">
        {/* Subtle geometric framing layer: exactly inset:0, identical border-radius, zero displacement */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit] pointer-events-none border border-purple-500/10"
        />

        {/* ==================================================== */}
        {/* SECTION 1: LANGUAGE & TIME FORMAT                    */}
        {/* ==================================================== */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2 className="text-sm font-bold text-white font-cinzel tracking-wider uppercase">
              {t('tabLocalization')}
            </h2>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-white/70">
              {t('interfaceLanguageDesc')}
            </p>

            {/* Language Selector: strictly aligned, equal sizes, matching heights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* English LTR Button */}
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                  language === 'en'
                    ? 'bg-purple-600/20 border-purple-500/60 text-white shadow-sm'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 text-white/70 hover:text-white'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold font-cinzel text-white">English</span>
                  <span className="text-[11px] text-white/50 font-orbitron mt-0.5">
                    LTR • Standard System Layout
                  </span>
                </div>
                {language === 'en' && (
                  <Check className="w-4 h-4 text-purple-400 shrink-0 ml-3" />
                )}
              </button>

              {/* Arabic RTL Button */}
              <button
                type="button"
                onClick={() => handleLanguageChange('ar')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-right ${
                  language === 'ar'
                    ? 'bg-purple-600/20 border-purple-500/60 text-white shadow-sm'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 text-white/70 hover:text-white'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold font-cairo text-white">العربية</span>
                  <span className="text-[11px] text-white/50 font-tajawal mt-0.5">
                    RTL • واجهة الصيادين من اليمين لليسار
                  </span>
                </div>
                {language === 'ar' && (
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mr-3" />
                )}
              </button>
            </div>

            {/* Time Format Selector: harmonious with language selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-purple-300/70 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-white block font-cinzel">
                    {t('timeFormat')}
                  </span>
                  <span className="text-[11px] text-white/50 font-orbitron">
                    {settings.timeFormat === '12h' ? t('timeFormat12') : t('timeFormat24')}
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/10 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                    onUpdateSettings({ timeFormat: '12h' });
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all cursor-pointer ${
                    settings.timeFormat === '12h'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  12H
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                    onUpdateSettings({ timeFormat: '24h' });
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all cursor-pointer ${
                    settings.timeFormat === '24h'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  24H
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 2: HUNTER IDENTITY & CUSTOMIZATION           */}
        {/* ==================================================== */}
        <section className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
            <User className="w-4 h-4 text-purple-400 shrink-0" />
            <h2 className="text-sm font-bold text-white font-cinzel tracking-wider uppercase">
              {t('tabHunterIdentity')}
            </h2>
          </div>

          <div className="space-y-4">
            {/* Avatar Selection */}
            <div>
              <label className="text-[10px] text-white/50 font-orbitron uppercase block mb-2.5">
                {t('avatarSelection')}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = player.avatar === preset.id || (!player.avatar && preset.id === 'monarch');
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectAvatar(preset.id)}
                      title={preset.label}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-900/30 border-purple-500 text-white'
                          : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 text-white/70'
                      }`}
                    >
                      <HunterAvatar avatar={preset.id} name={player.name} size="sm" />
                      <span className="text-[9px] font-cinzel truncate max-w-full text-center">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/50 font-orbitron uppercase block mb-1">
                    {t('hunterCodename')}
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-cinzel focus:outline-none focus:border-purple-500/50 transition-colors"
                    placeholder="Hunter Codename"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/50 font-orbitron uppercase block mb-1">
                    {t('hunterTitle')}
                  </label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-rajdhani focus:outline-none focus:border-purple-500/50 transition-colors"
                    placeholder="Awakened Title"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-emerald-400 font-orbitron flex items-center gap-1">
                  {saveSuccess && (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('save')} Success</span>
                    </>
                  )}
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-orbitron transition-all cursor-pointer shadow-sm"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 3: AUDIO & SFX ARCHITECTURE                  */}
        {/* ==================================================== */}
        <section className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-white font-cinzel tracking-wider uppercase">
                  {t('tabAudioSFX')}
                </h2>
                <span className="text-[10px] text-white/50 font-orbitron">
                  {t('systemAudioArchitecture')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSoundToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold cursor-pointer transition-all ${
                settings.soundEnabled
                  ? 'bg-purple-600/30 border border-purple-500/50 text-purple-200'
                  : 'bg-white/[0.05] border border-white/10 text-white/40'
              }`}
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-purple-300" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-white/40" />
              )}
              <span>{settings.soundEnabled ? 'SFX ON' : 'SFX OFF'}</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Master Volume Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-white/50 font-orbitron uppercase">
                  {t('masterVolume')}
                </label>
                <span className="text-xs font-bold text-purple-300 font-orbitron">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={handleVolumeChange}
                className="w-full accent-purple-500 cursor-pointer bg-white/10 rounded-lg h-1.5"
              />
            </div>

            {/* SFX Tester Buttons */}
            <div>
              <span className="text-[10px] text-white/50 font-orbitron uppercase block mb-2">
                {t('testSystemSFX')}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {soundEventList.map((item) => (
                  <button
                    key={item.event}
                    type="button"
                    onClick={() => soundManager.playSound(item.event)}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 text-white/80 hover:text-white text-[10px] font-orbitron transition-all cursor-pointer truncate"
                  >
                    <Play className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 4: APPEARANCE & HUD THEMING                  */}
        {/* ==================================================== */}
        <section className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
            <Palette className="w-4 h-4 text-purple-400 shrink-0" />
            <h2 className="text-sm font-bold text-white font-cinzel tracking-wider uppercase">
              {t('tabAppearance')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Theme Mode */}
            <div>
              <label className="text-[10px] text-white/50 font-orbitron uppercase block mb-2">
                {t('systemTheme')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'light', labelKey: 'themeLight', desc: 'Minimal' },
                    { id: 'dark', labelKey: 'themeDark', desc: 'Void' },
                    { id: 'midnight', labelKey: 'themeMidnight', desc: 'Dusk' },
                    { id: 'cyber', labelKey: 'themeCyber', desc: 'Cyber' },
                  ] as const
                ).map((th) => {
                  const isSelected = (settings.theme || 'dark') === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => handleThemeChange(th.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-start gap-0.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-900/30 border-purple-500 text-white'
                          : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 text-white/70'
                      }`}
                    >
                      <span className="text-xs font-bold font-cinzel">
                        {t(th.labelKey)}
                      </span>
                      <span className="text-[9px] text-white/40 font-orbitron">
                        {th.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Color Palette */}
            <div>
              <label className="text-[10px] text-white/50 font-orbitron uppercase block mb-2">
                {t('accentEnergy')}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(
                  [
                    { id: 'purple', labelKey: 'accentPurple', bg: 'bg-purple-500' },
                    { id: 'cyan', labelKey: 'accentCyan', bg: 'bg-cyan-500' },
                    { id: 'emerald', labelKey: 'accentEmerald', bg: 'bg-emerald-500' },
                    { id: 'gold', labelKey: 'accentGold', bg: 'bg-yellow-500' },
                    { id: 'rose', labelKey: 'accentRose', bg: 'bg-rose-500' },
                  ] as const
                ).map((acc) => {
                  const isSelected = (settings.accentColor || 'purple') === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleAccentChange(acc.id)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/10 border-white/40 text-white'
                          : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 text-white/70'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${acc.bg}`} />
                      <span className="text-[9px] font-orbitron truncate max-w-full">
                        {t(acc.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 5: USER DATA & BACKUP                        */}
        {/* ==================================================== */}
        <section className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
              <h2 className="text-sm font-bold text-white font-cinzel tracking-wider uppercase">
                {t('tabBackupSync')}
              </h2>
            </div>

            {/* Switch Account */}
            <button
              type="button"
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                onOpenAuthModal();
              }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-white/80 hover:text-white text-[11px] font-orbitron cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>{t('switchAccount')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {/* Active hunter profile pill */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HunterAvatar avatar={player.avatar} name={player.name} size="sm" />
                <div>
                  <span className="text-xs font-bold text-white font-cinzel block">
                    {player.name}
                  </span>
                  <span className="text-[10px] text-purple-300/80 font-orbitron">
                    {player.rank}-Rank Awakened • {currentUser.email}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-orbitron font-bold">
                ACTIVE
              </span>
            </div>

            {/* Export / Import Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 text-white text-xs font-orbitron font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export State JSON</span>
              </button>

              <label className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 text-white text-xs font-orbitron font-semibold transition-all cursor-pointer flex items-center justify-center gap-2">
                <Upload className="w-3.5 h-3.5 text-purple-400" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>

            {importStatus && (
              <p className="text-xs text-amber-300 font-orbitron text-center">
                {importStatus}
              </p>
            )}

            {/* Cloud Sync Action */}
            <button
              type="button"
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                onOpenSyncModal();
              }}
              className="w-full py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 text-white/90 hover:text-white text-xs font-orbitron font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configure GitHub Gist Cloud Sync</span>
            </button>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 6: SYSTEM AI ARCHITECTURE & PROTOCOLS        */}
        {/* ==================================================== */}
        <section className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <h2 className="text-sm font-bold text-white font-cinzel tracking-wider uppercase">
                {t('tabAiConfig')}
              </h2>
            </div>

            {onReplayAwakening && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playSound(SoundEvent.SYSTEM_BOOT);
                  onReplayAwakening();
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 text-[11px] font-orbitron font-semibold cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-purple-300" />
                <span>{t('replayAwakening')}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/50 font-orbitron uppercase block">
                  {t('aiProvider')}
                </span>
                <span className="text-xs font-bold text-white font-cinzel">
                  Google Gemini Neural Core
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-orbitron font-bold">
                CONNECTED
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/50 font-orbitron uppercase block">
                  {t('aiStatus')}
                </span>
                <span className="text-xs font-semibold text-emerald-400 font-orbitron">
                  {t('aiOnline')}
                </span>
              </div>
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 7: FACTORY RESET (DANGER ZONE)               */}
        {/* ==================================================== */}
        <section className="space-y-3 pt-2 border-t border-white/5">
          <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-500/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-rose-300 font-cinzel uppercase tracking-wider">
                    {t('factoryReset')}
                  </h3>
                  <span className="text-[10px] text-rose-400/70 font-orbitron">
                    System Calibration & State Formatting
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playSound(SoundEvent.ERROR);
                  setShowFactoryResetModal(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-orbitron font-bold tracking-wider border border-rose-400/30 transition-all cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{t('factoryReset')}</span>
              </button>
            </div>

            <p className="text-[11px] text-rose-200/70 font-rajdhani leading-relaxed">
              {t('factoryResetDesc')}
            </p>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 8: ABOUT SYSTEM INFORMATION                  */}
        {/* ==================================================== */}
        <section className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-white/40 text-[10px] font-orbitron">
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3 text-purple-400/60 shrink-0" />
            <span>{t('appBuild')}</span>
          </div>
          <div>
            <span>{t('pwaOfflineReady')}</span>
          </div>
        </section>
      </div>

      {/* Factory Reset Confirmation Modal */}
      {showFactoryResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-md w-full bg-[#141022] rounded-2xl p-6 border border-rose-500/40 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
              <h3 className="text-sm font-bold font-cinzel tracking-wider uppercase text-white">
                {t('factoryResetConfirmTitle')}
              </h3>
            </div>

            <p className="text-xs text-white/70 font-rajdhani leading-relaxed">
              {t('factoryResetConfirmDesc')}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                  setShowFactoryResetModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-orbitron font-bold cursor-pointer transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFactoryResetModal(false);
                  if (onFactoryReset) {
                    onFactoryReset();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-orbitron font-bold cursor-pointer transition-all shadow-md shadow-rose-900/40"
              >
                {t('factoryResetConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
