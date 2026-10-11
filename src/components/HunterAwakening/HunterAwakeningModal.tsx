import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Zap,
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  Clock,
  Target,
  BookOpen,
  User,
  Volume2,
  VolumeX,
  Globe,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Layers,
  ChevronRight,
  Crosshair
} from 'lucide-react';
import {
  PlayerStats,
  Quest,
  SkillNode,
  SoundEvent,
  HunterAwakeningAnswer,
  HunterAwakeningProfile
} from '../../types';
import { HunterAwakeningService } from '../../services/ai/HunterAwakeningService';
import { soundManager } from '../../utils/audio';
import { useI18n } from '../../i18n';
import { AVATAR_PRESETS, HunterAvatar } from '../HunterAvatar';

interface HunterAwakeningModalProps {
  isOpen: boolean;
  isReplay?: boolean;
  onComplete: (data: {
    name: string;
    avatar: string;
    title: string;
    stats?: PlayerStats['stats'];
    skills?: SkillNode[];
    quests?: Quest[];
  }) => void;
  onClose?: () => void;
}

type AwakeningPhase =
  | 'boot'          // Phase 0: System Boot & Initial Discovery
  | 'greeting'      // Phase 1: System Greeting
  | 'interview'     // Phase 2: AI-Driven Discovery Interview
  | 'analyzing'     // Phase 3: AI Hunter Analysis Diagnostics
  | 'reveal'        // Phase 4: Hunter Profile Awakening Reveal
  | 'quests'        // Phase 5: Initial Quest Review
  | 'surge';        // Phase 6: Awakening Power Surge & System Online

export const HunterAwakeningModal: React.FC<HunterAwakeningModalProps> = ({
  isOpen,
  isReplay = false,
  onComplete,
  onClose,
}) => {
  const { t, language, setLanguage, isRTL } = useI18n();

  // Active Phase
  const [phase, setPhase] = useState<AwakeningPhase>('boot');

  // Boot sequence animation step
  const [bootStep, setBootStep] = useState<number>(0);
  const [lightningFlash, setLightningFlash] = useState<boolean>(false);

  // Sound State
  const [soundMuted, setSoundMuted] = useState<boolean>(() => soundManager.getMuted());

  // Interview state
  const [history, setHistory] = useState<HunterAwakeningAnswer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentPlaceholder, setCurrentPlaceholder] = useState<string>('');
  const [currentCategory, setCurrentCategory] = useState<string>('goals');
  const [answerInput, setAnswerInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isReadyForAnalysis, setIsReadyForAnalysis] = useState<boolean>(false);

  // Diagnostics Progress State
  const [diagProgress, setDiagProgress] = useState<number>(0);

  // Generated Profile & Quests
  const [generatedProfile, setGeneratedProfile] = useState<HunterAwakeningProfile | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_PRESETS[0].id);
  const [customName, setCustomName] = useState<string>('');
  const [selectedQuestIds, setSelectedQuestIds] = useState<Record<string, boolean>>({});

  const answerInputRef = useRef<HTMLTextAreaElement>(null);

  // Mute / Unmute
  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    soundManager.setSoundEnabled(!next);
  };

  // Toggle Language
  const toggleLanguage = () => {
    const nextLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(nextLang);
    soundManager.playSound(SoundEvent.SYSTEM_OPEN);
  };

  // Boot sequence logic
  useEffect(() => {
    if (!isOpen) return;

    // Reset initial states
    setPhase('boot');
    setBootStep(0);

    const bootTimer1 = setTimeout(() => {
      soundManager.playSound(SoundEvent.SYSTEM_BOOT);
      setBootStep(1);
    }, 900);

    const flashTimer = setTimeout(() => {
      setLightningFlash(true);
      soundManager.playSound(SoundEvent.LIGHTNING_PULSE);
      setTimeout(() => setLightningFlash(false), 240);
    }, 1800);

    const bootTimer2 = setTimeout(() => {
      setBootStep(2);
    }, 2400);

    const bootTimer3 = setTimeout(() => {
      setBootStep(3);
    }, 3800);

    const greetingTimer = setTimeout(() => {
      setPhase('greeting');
      soundManager.playSound(SoundEvent.SYSTEM_OPEN);
    }, 5200);

    return () => {
      clearTimeout(bootTimer1);
      clearTimeout(flashTimer);
      clearTimeout(bootTimer2);
      clearTimeout(bootTimer3);
      clearTimeout(greetingTimer);
    };
  }, [isOpen]);

  // Load first question when transitioning to interview
  const startInterview = async () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    setPhase('interview');
    setIsAiLoading(true);
    setAiError(null);

    try {
      const firstQ = await HunterAwakeningService.generateNextQuestion([], language);
      setCurrentQuestion(firstQ.question);
      setCurrentPlaceholder(firstQ.placeholder || '');
      setCurrentCategory(firstQ.category || 'primary_goal');
      setIsReadyForAnalysis(firstQ.isReadyForAnalysis);
      soundManager.playSound(SoundEvent.QUESTION_APPEAR);
    } catch (e: any) {
      console.warn('Initial interview question error:', e);
      const fallback = HunterAwakeningService.getFallbackQuestion(0, language);
      setCurrentQuestion(fallback.question);
      setCurrentPlaceholder(fallback.placeholder || '');
      setCurrentCategory(fallback.category || 'primary_goal');
    } finally {
      setIsAiLoading(false);
      setTimeout(() => answerInputRef.current?.focus(), 150);
    }
  };

  // Submit current answer and fetch next
  const handleConfirmAnswer = async () => {
    if (!answerInput.trim() || isAiLoading) return;

    soundManager.playSound(SoundEvent.ANSWER_CONFIRM);

    const newAnswer: HunterAwakeningAnswer = {
      questionId: `q-${history.length}`,
      questionText: currentQuestion,
      answerText: answerInput.trim(),
      category: currentCategory,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...history, newAnswer];
    setHistory(nextHistory);
    setAnswerInput('');

    // If 6 or more answers, or flagged ready and user has answered at least 4 questions
    if (nextHistory.length >= 7 || (isReadyForAnalysis && nextHistory.length >= 4)) {
      triggerAnalysis(nextHistory);
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const nextQ = await HunterAwakeningService.generateNextQuestion(nextHistory, language);
      setCurrentQuestion(nextQ.question);
      setCurrentPlaceholder(nextQ.placeholder || '');
      setCurrentCategory(nextQ.category || 'general');
      setIsReadyForAnalysis(nextQ.isReadyForAnalysis);
      soundManager.playSound(SoundEvent.QUESTION_APPEAR);
    } catch (err: any) {
      console.warn('Follow-up question error:', err);
      const fallback = HunterAwakeningService.getFallbackQuestion(nextHistory.length, language);
      setCurrentQuestion(fallback.question);
      setCurrentPlaceholder(fallback.placeholder || '');
      setCurrentCategory(fallback.category || 'general');
    } finally {
      setIsAiLoading(false);
      setTimeout(() => answerInputRef.current?.focus(), 150);
    }
  };

  // Skip Question
  const handleSkipQuestion = async () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);

    const skippedAnswer: HunterAwakeningAnswer = {
      questionId: `q-${history.length}`,
      questionText: currentQuestion,
      answerText: language === 'ar' ? 'تم التخطي' : 'Skipped by Hunter',
      category: currentCategory,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...history, skippedAnswer];
    setHistory(nextHistory);
    setAnswerInput('');

    if (nextHistory.length >= 6) {
      triggerAnalysis(nextHistory);
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const nextQ = await HunterAwakeningService.generateNextQuestion(nextHistory, language);
      setCurrentQuestion(nextQ.question);
      setCurrentPlaceholder(nextQ.placeholder || '');
      setCurrentCategory(nextQ.category || 'general');
      setIsReadyForAnalysis(nextQ.isReadyForAnalysis);
      soundManager.playSound(SoundEvent.QUESTION_APPEAR);
    } catch {
      const fallback = HunterAwakeningService.getFallbackQuestion(nextHistory.length, language);
      setCurrentQuestion(fallback.question);
      setCurrentPlaceholder(fallback.placeholder || '');
      setCurrentCategory(fallback.category || 'general');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Back to edit previous answer
  const handleBackQuestion = () => {
    if (history.length === 0) return;
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);

    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentQuestion(last.questionText);
    setAnswerInput(last.answerText === 'Skipped by Hunter' || last.answerText === 'تم التخطي' ? '' : last.answerText);
    setCurrentCategory(last.category || 'general');
  };

  // Trigger analysis sequence
  const triggerAnalysis = async (finalHistory: HunterAwakeningAnswer[]) => {
    setPhase('analyzing');
    setDiagProgress(0);

    // Progressive visual diagnostics
    const diagInterval = setInterval(() => {
      setDiagProgress(prev => {
        const next = prev + 1;
        soundManager.playSound(SoundEvent.ANALYSIS_PULSE);
        if (next >= 5) {
          clearInterval(diagInterval);
        }
        return next;
      });
    }, 700);

    try {
      const profile = await HunterAwakeningService.analyzeHunterProfile(finalHistory, language);
      setGeneratedProfile(profile);
      setCustomName(profile.preferredName);

      // Pre-select all generated initial quests
      const initialMap: Record<string, boolean> = {};
      profile.initialQuests.forEach(q => {
        initialMap[q.id] = true;
      });
      setSelectedQuestIds(initialMap);

      // Transition to reveal phase
      setTimeout(() => {
        setPhase('reveal');
        soundManager.playSound(SoundEvent.PROFILE_REVEAL);
      }, 3800);
    } catch (e) {
      console.error('Profile generation failed, using fallback:', e);
      const fallback = HunterAwakeningService.getFallbackProfile(finalHistory, language);
      setGeneratedProfile(fallback);
      setCustomName(fallback.preferredName);

      const initialMap: Record<string, boolean> = {};
      fallback.initialQuests.forEach(q => {
        initialMap[q.id] = true;
      });
      setSelectedQuestIds(initialMap);

      setTimeout(() => {
        setPhase('reveal');
        soundManager.playSound(SoundEvent.PROFILE_REVEAL);
      }, 3800);
    }
  };

  // Toggle Quest Selection
  const toggleQuestSelection = (questId: string) => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    setSelectedQuestIds(prev => ({
      ...prev,
      [questId]: !prev[questId],
    }));
  };

  // Final Awakening Completion Sequence
  const finalizeAwakening = (includeQuests: boolean) => {
    soundManager.playSound(SoundEvent.AWAKENING_SURGE);
    setPhase('surge');

    const questsToApply = includeQuests && generatedProfile
      ? generatedProfile.initialQuests.filter(q => selectedQuestIds[q.id])
      : [];

    const skillsToApply: SkillNode[] = generatedProfile?.suggestedSkills
      ? generatedProfile.suggestedSkills.map((s, idx) => ({
          id: `awakened-skill-${idx}-${Date.now()}`,
          name: s.name,
          level: 1,
          maxLevel: 10,
          xp: 0,
          xpToNext: 100,
          category: s.category || 'General',
          description: s.description,
          buff: s.buff,
          iconName: 'Sparkles',
        }))
      : [];

    setTimeout(() => {
      onComplete({
        name: customName.trim() || generatedProfile?.preferredName || 'Sung Jin-Woo',
        avatar: selectedAvatar,
        title: generatedProfile?.title || (language === 'ar' ? 'E-Rank صياد مستيقظ' : 'E-Rank Awakened Initiate'),
        stats: generatedProfile?.suggestedStats,
        skills: skillsToApply,
        quests: questsToApply,
      });
    }, 4200);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05060b] text-white font-rajdhani overflow-hidden select-none"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Lightning Flash Overlay */}
      <AnimatePresence>
        {lightningFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-cyan-100 z-50 pointer-events-none mix-blend-screen"
          />
        )}
      </AnimatePresence>

      {/* Atmospheric Background Ambient Grid & Glowing Embers */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.14)_0%,rgba(5,6,11,0.98)_85%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

      {/* Futuristic Scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-25" />

      {/* Top Floating Controls (Mute, Language, and Optional Replay Close) */}
      <div className="absolute top-5 inset-x-6 z-40 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[11px] font-orbitron font-bold tracking-widest text-cyan-400/90 uppercase">
            {t('appTitle')} • {t('awakeningSubtitle')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-orbitron text-white/80 transition-all cursor-pointer"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              !soundMuted
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}
            title="Toggle Sound"
          >
            {!soundMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Replay Close Button if replaying */}
          {isReplay && onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-orbitron font-bold transition-all cursor-pointer"
            >
              {t('close')}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHASE 0: SYSTEM BOOT SEQUENCE */}
      {/* ========================================================================= */}
      {phase === 'boot' && (
        <motion.div
          key="boot-phase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative max-w-xl w-full px-6 flex flex-col items-center justify-center text-center space-y-6"
        >
          {/* Glowing central core node */}
          <div className="relative w-24 h-24 flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
            <div className="w-20 h-20 rounded-full border-2 border-cyan-400/40 flex items-center justify-center animate-spin" style={{ animationDuration: '8s' }}>
              <div className="w-14 h-14 rounded-full border border-purple-500/50 flex items-center justify-center animate-spin" style={{ animationDirection: 'reverse', animationDuration: '4s' }}>
                <Zap className="w-6 h-6 text-cyan-300" />
              </div>
            </div>
          </div>

          <div className="space-y-3 font-orbitron">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-cyan-400 font-bold tracking-[0.25em] uppercase animate-pulse"
            >
              {t('systemInitializing')}
            </motion.p>

            <AnimatePresence>
              {bootStep >= 1 && (
                <motion.h1
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-2xl sm:text-3xl font-black text-white font-cinzel tracking-wider"
                >
                  {t('unknownHunterDetected')}
                </motion.h1>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {bootStep >= 2 && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-purple-300 tracking-widest font-mono"
                >
                  {t('initializingHunterProtocol')}
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {bootStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-2"
                >
                  <span className="inline-block px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono tracking-widest">
                    {t('identityUnknown')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Skip Boot Button */}
          <button
            onClick={() => {
              soundManager.playSound(SoundEvent.SYSTEM_OPEN);
              setPhase('greeting');
            }}
            className="text-[11px] text-white/40 hover:text-white/80 font-orbitron tracking-wider pt-6 transition-colors cursor-pointer"
          >
            [ {language === 'ar' ? 'تخطي التمهيد' : 'SKIP INITIALIZATION'} ]
          </button>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 1: SYSTEM GREETING */}
      {/* ========================================================================= */}
      {phase === 'greeting' && (
        <motion.div
          key="greeting-phase"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="relative max-w-lg w-full mx-4 p-8 sm:p-10 rounded-3xl bg-[#090b14]/90 border border-purple-500/30 backdrop-blur-2xl shadow-2xl shadow-purple-950/50 space-y-8 text-center"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* System Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-orbitron font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{t('appTitle')}</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-wide leading-relaxed">
              {t('awakeningGreeting1')}
            </h2>
            <p className="text-sm sm:text-base text-white/70 font-rajdhani leading-relaxed max-w-md mx-auto">
              {t('awakeningGreeting2')}
            </p>
          </div>

          {/* Awakening Trigger Button */}
          <div className="pt-2">
            <button
              onClick={startInterview}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-orbitron font-black text-sm sm:text-base tracking-widest shadow-xl shadow-purple-600/40 border border-purple-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3"
            >
              <span>{t('beginAwakening')}</span>
              {isRTL ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2: AI-DRIVEN DISCOVERY INTERVIEW */}
      {/* ========================================================================= */}
      {phase === 'interview' && (
        <motion.div
          key="interview-phase"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="relative max-w-2xl w-full mx-4 p-6 sm:p-8 rounded-3xl bg-[#090b14]/95 border border-white/10 backdrop-blur-2xl shadow-2xl shadow-black/80 space-y-6"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Header & Subtle Node Progress Indicator */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
              <span className="text-xs font-orbitron font-bold tracking-widest text-cyan-300 uppercase">
                {t('systemDiscovery')}
              </span>
            </div>

            {/* Glowing Pips */}
            <div className="flex items-center gap-1.5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                    i < history.length
                      ? 'bg-purple-500 shadow-md shadow-purple-500/50 scale-110'
                      : i === history.length
                      ? 'bg-cyan-400 animate-pulse'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* AI Question Box */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-orbitron uppercase px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {t('systemAi')} • {currentCategory.toUpperCase()}
              </span>
              <span className="text-[11px] font-mono text-white/50">
                NODE #{history.length + 1}
              </span>
            </div>

            {isAiLoading ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
                <p className="text-xs text-purple-300 font-orbitron tracking-wider">
                  {language === 'ar' ? 'النظام يحلل المعطيات ويصوغ السؤال...' : 'The System is formulating the next inquiry...'}
                </p>
              </div>
            ) : (
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed font-cinzel">
                  {currentQuestion}
                </h3>
              </motion.div>
            )}

            {/* User Input Area */}
            {!isAiLoading && (
              <div className="space-y-4 pt-2">
                <textarea
                  ref={answerInputRef}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleConfirmAnswer();
                    }
                  }}
                  placeholder={currentPlaceholder || (language === 'ar' ? 'اكتب إجابتك هنا بصدق...' : 'Type your answer here...')}
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 focus:border-cyan-400 text-white placeholder-white/40 text-sm sm:text-base resize-none outline-none transition-all font-rajdhani leading-relaxed"
                />

                {/* Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {history.length > 0 && (
                      <button
                        onClick={handleBackQuestion}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-orbitron transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                        <span>{t('backQuestion')}</span>
                      </button>
                    )}

                    <button
                      onClick={handleSkipQuestion}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 text-xs font-orbitron transition-all cursor-pointer"
                    >
                      {t('skipQuestion')}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {history.length >= 4 && (
                      <button
                        onClick={() => triggerAnalysis(history)}
                        className="px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-orbitron font-bold transition-all cursor-pointer"
                      >
                        {language === 'ar' ? 'بدء التحليل الآن' : 'Analyze Now'}
                      </button>
                    )}

                    <button
                      onClick={handleConfirmAnswer}
                      disabled={!answerInput.trim()}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-orbitron font-bold tracking-wider shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>{t('confirmAnswer')}</span>
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3: AI HUNTER ANALYSIS DIAGNOSTICS */}
      {/* ========================================================================= */}
      {phase === 'analyzing' && (
        <motion.div
          key="analyzing-phase"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-lg w-full mx-4 p-8 sm:p-10 rounded-3xl bg-[#090b14]/95 border border-purple-500/40 backdrop-blur-2xl shadow-2xl shadow-purple-950/60 space-y-8 text-center"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Central Radar Pulse */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-2xl animate-pulse" />
            <div className="w-24 h-24 rounded-full border-2 border-purple-500/50 border-t-cyan-400 animate-spin flex items-center justify-center" style={{ animationDuration: '2s' }}>
              <div className="w-16 h-16 rounded-full border border-cyan-400/40 flex items-center justify-center">
                <Target className="w-8 h-8 text-cyan-300 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-wider">
              {t('analyzingHunter')}
            </h2>
            <p className="text-xs text-purple-300 font-orbitron tracking-widest uppercase">
              {language === 'ar' ? 'معالجة بيانات المقابلة واستخلاص المسار' : 'Synthesizing Strategic Hunter Blueprint'}
            </p>
          </div>

          {/* Diagnostics Telemetry List */}
          <div className="space-y-2.5 font-mono text-xs text-left max-w-sm mx-auto" dir="ltr">
            {[
              { label: t('diagGoalPattern'), state: t('diagDetected'), threshold: 1 },
              { label: t('diagMotivation'), state: t('diagAnalyzed'), threshold: 2 },
              { label: t('diagLearningStyle'), state: t('diagIdentified'), threshold: 3 },
              { label: t('diagTimeCapacity'), state: t('diagCalculated'), threshold: 4 },
              { label: t('diagQuestProfile'), state: t('diagGenerating'), threshold: 5 },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 ${
                  diagProgress >= item.threshold
                    ? 'bg-purple-950/40 text-cyan-300 border border-purple-500/30'
                    : 'text-white/20'
                }`}
              >
                <span>{item.label}</span>
                <span className="font-bold tracking-wider">
                  {diagProgress >= item.threshold ? `[ ${item.state} ]` : '.........'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 4: AWAKENING RESULT (HUNTER PROFILE REVEAL) */}
      {/* ========================================================================= */}
      {phase === 'reveal' && generatedProfile && (
        <motion.div
          key="reveal-phase"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-[#090b14]/95 border border-gold-500/40 backdrop-blur-2xl shadow-2xl shadow-amber-950/40 space-y-6"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Reveal Header */}
          <div className="text-center space-y-2 pb-4 border-b border-white/10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-orbitron font-bold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('systemAnalysisComplete')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-wider">
              {t('hunterIdentified')}
            </h2>
          </div>

          {/* Main Card: Avatar, Name, Rank */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Selector */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <HunterAvatar avatar={selectedAvatar} name={customName || 'Hunter'} size="lg" />
              <div className="flex items-center gap-1.5">
                {AVATAR_PRESETS.slice(0, 6).map(av => (
                  <button
                    key={av.id}
                    onClick={() => {
                      soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                      setSelectedAvatar(av.id);
                    }}
                    className={`rounded-lg border transition-all cursor-pointer ${
                      selectedAvatar === av.id
                        ? 'border-purple-400 ring-2 ring-purple-400/50 scale-110'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                    title={av.label}
                  >
                    <HunterAvatar avatar={av.id} name={av.label} size="xs" />
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Data */}
            <div className="flex-1 space-y-3 text-center sm:text-start w-full">
              <div>
                <label className="text-[10px] text-white/50 font-orbitron uppercase block">
                  {language === 'ar' ? 'اسم الصياد المعتمد' : 'Hunter Identifier'}
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="text-lg sm:text-xl font-black text-white font-cinzel bg-transparent border-b border-white/20 hover:border-purple-400 focus:border-cyan-400 outline-none pb-0.5 w-full transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-orbitron font-bold">
                  UNKNOWN → E-RANK
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-orbitron">
                  {generatedProfile.primaryPath}
                </span>
              </div>

              <p className="text-xs text-white/70 font-rajdhani">
                <strong className="text-white">{t('primaryGoal')}:</strong> {generatedProfile.primaryGoal}
              </p>
            </div>
          </div>

          {/* Stats Breakdown */}
          {generatedProfile.suggestedStats && (
            <div className="space-y-2">
              <span className="text-[10px] font-orbitron text-white/50 uppercase block">
                {language === 'ar' ? 'السمات الأساسية الابتدائية' : 'Initial Attribute Distribution'}
              </span>
              <div className="grid grid-cols-5 gap-2 text-center">
                {Object.entries(generatedProfile.suggestedStats).map(([key, val]) => (
                  <div key={key} className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[9px] font-orbitron text-white/50 uppercase block">
                      {key.slice(0, 3)}
                    </span>
                    <span className="text-sm font-black text-cyan-300 font-orbitron">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action to proceed to Quests */}
          <div className="pt-2">
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                setPhase('quests');
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-orbitron font-bold text-sm tracking-wider shadow-lg shadow-purple-600/30 border border-purple-400/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{t('reviewQuests')}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 5: INITIAL QUEST REVIEW */}
      {/* ========================================================================= */}
      {phase === 'quests' && generatedProfile && (
        <motion.div
          key="quests-phase"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-[#090b14]/95 border border-purple-500/30 backdrop-blur-2xl shadow-2xl shadow-black/80 space-y-6"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Header */}
          <div className="space-y-2 pb-3 border-b border-white/10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-orbitron font-bold tracking-widest uppercase">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('initialQuestsDetected')}</span>
            </div>
            <p className="text-xs sm:text-sm text-white/70 font-rajdhani">
              {t('initialQuestsDesc')}
            </p>
          </div>

          {/* Quest Cards List */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {generatedProfile.initialQuests.map((quest) => {
              const isSelected = !!selectedQuestIds[quest.id];
              return (
                <div
                  key={quest.id}
                  onClick={() => toggleQuestSelection(quest.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'bg-purple-950/30 border-purple-500/50 shadow-md shadow-purple-950/50'
                      : 'bg-white/5 border-white/10 opacity-60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-orbitron font-bold uppercase">
                        {quest.type === 'daily' ? 'DAILY TRIAL' : 'WEEKLY RAID'}
                      </span>
                      <h4 className="text-sm font-bold text-white font-cinzel">
                        {quest.title}
                      </h4>
                    </div>
                    <p className="text-xs text-white/60 font-rajdhani leading-relaxed">
                      {quest.description}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] font-orbitron">
                      <span className="text-cyan-300">+{quest.xpReward} XP</span>
                      <span className="text-amber-300">+{quest.goldReward} Gold</span>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-1 transition-all ${
                    isSelected
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'border-white/20'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
            <button
              onClick={() => finalizeAwakening(false)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-orbitron transition-all cursor-pointer"
            >
              {t('skipQuestsAndAwaken')}
            </button>

            <button
              onClick={() => finalizeAwakening(true)}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-orbitron font-black text-sm tracking-widest shadow-xl shadow-purple-600/40 border border-purple-400/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{t('applyQuestsAndAwaken')}</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 6: AWAKENING SURGE & SYSTEM ONLINE */}
      {/* ========================================================================= */}
      {phase === 'surge' && (
        <motion.div
          key="surge-phase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative max-w-lg w-full px-6 flex flex-col items-center justify-center text-center space-y-6"
        >
          {/* Intense Glowing Energy Node */}
          <div className="relative w-36 h-36 flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-3xl animate-ping" />
            <div className="w-28 h-28 rounded-full border-4 border-purple-400/60 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
              <div className="w-20 h-20 rounded-full border-2 border-cyan-300 flex items-center justify-center animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}>
                <Zap className="w-10 h-10 text-amber-300 animate-bounce" />
              </div>
            </div>
          </div>

          <div className="space-y-3 font-orbitron">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-purple-300 tracking-widest font-mono"
            >
              {t('profileInitialized')}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5 }}
              className="text-2xl sm:text-3xl font-black text-white font-cinzel tracking-wider"
            >
              {t('journeyBeginsNow')}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.7 }}
              className="pt-4"
            >
              <span className="inline-block px-6 py-2 rounded-full bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 text-base font-orbitron font-black tracking-[0.3em] shadow-xl shadow-cyan-500/50">
                {t('systemOnline')}
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
