import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldAlert,
  Cpu,
  Zap,
  Swords,
  Award,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Check,
  Flame,
  ArrowRight,
  TrendingUp,
  Settings2,
  Trash2,
  Key,
  Target,
  FolderGit2,
  Flag,
} from 'lucide-react';
import {
  PlayerStats,
  Quest,
  SkillNode,
  Achievement,
  XPHistoryEntry,
  SystemLog,
  HunterGoal,
  HunterProject,
  SystemAction,
  SoundEvent,
} from '../../types';
import { soundManager } from '../../utils/audio';
import { useI18n } from '../../i18n';

interface SystemAIPageProps {
  player: PlayerStats;
  quests: Quest[];
  skills: SkillNode[];
  achievements: Achievement[];
  history: XPHistoryEntry[];
  logs: SystemLog[];
  goals?: HunterGoal[];
  projects?: HunterProject[];
  onExecuteActions: (actions: SystemAction[]) => void;
  onExecuteSingleAction: (action: SystemAction) => void;
}

interface ChatMessage {
  id: string;
  sender: 'system' | 'user';
  text: string;
  timestamp: string;
  actions?: SystemAction[];
  isError?: boolean;
  actionsApplied?: boolean;
}

const STORAGE_KEY_ENGINE_MSGS = 'solo_engine_chat_messages';
const STORAGE_KEY_AUTONOMY_MODE = 'solo_engine_autonomy_mode';

export const SystemAIPage: React.FC<SystemAIPageProps> = ({
  player,
  quests,
  skills,
  achievements,
  history,
  logs,
  goals = [],
  projects = [],
  onExecuteActions,
  onExecuteSingleAction,
}) => {
  const { t, language, isRTL } = useI18n();
  const [autonomyMode, setAutonomyMode] = useState<'auto_apply' | 'ask_before_apply'>(() => {
    return (localStorage.getItem(STORAGE_KEY_AUTONOMY_MODE) as any) || 'auto_apply';
  });

  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyLoading, setIsApiKeyLoading] = useState<boolean>(true);
  const [customKeyModal, setCustomKeyModal] = useState<boolean>(false);
  const [customKeyInput, setCustomKeyInput] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ENGINE_MSGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    const defaultText =
      language === 'ar'
        ? `[إشعار النظام: المحرك المستقل نشط]\nمرحباً بك أيها الصياد ${player.name} (الرتبة: ${player.rank}-Rank). بصفتي النظام المركزي لسولو ليفلينج، أنا أمتلك الصلاحية الكاملة لإدارة حالتك، إصدار المهام، مكافأة إنجازاتك، أو فرض عقوبات عند التراجع.\n\nأخبرني بما أنجزته اليوم، أو اطلب خطة مهام وتدريب للارتقاء بمستواك.`
        : `[SYSTEM DIRECTIVE: AUTONOMOUS CORE ACTIVE]\nWelcome, Hunter ${player.name} (${player.rank}-Rank). As the Central Solo Leveling System, I possess direct authority to calibrate your status, commission quests, grant ascension rewards, or enforce penalty protocols if you falter.\n\nReport your accomplishments today, or request a tactical quest roadmap to level up.`;

    return [
      {
        id: 'init-engine-1',
        sender: 'system',
        text: defaultText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Strict client key resolution
  const getResolvedApiKey = () => {
    return (
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      localStorage.getItem('solo_gemini_api_key') ||
      apiKey ||
      ''
    );
  };

  // Initialize key strictly from client env or storage
  useEffect(() => {
    setIsApiKeyLoading(true);
    const resolved = getResolvedApiKey();
    if (resolved) {
      setApiKey(resolved);
    }
    setIsApiKeyLoading(false);
  }, []);

  // Save messages to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ENGINE_MSGS, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save engine messages:', err);
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Toggle autonomy mode
  const handleToggleAutonomy = (mode: 'auto_apply' | 'ask_before_apply') => {
    setAutonomyMode(mode);
    localStorage.setItem(STORAGE_KEY_AUTONOMY_MODE, mode);
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
  };

  // Quick Action Prompts
  const quickPrompts =
    language === 'ar'
      ? [
          {
            title: '🎯 تخطيط هدف استراتيجي وحملات',
            prompt: 'حلل تقدمي الحالي وأنشئ هدفاً استراتيجياً بعيد المدى، مع مشاريع وحملات ومحطات قياس لهذا الربع.',
          },
          {
            title: '📝 تقرير إنجاز يومي',
            prompt: 'تقرير اليوم: أتممت 60 دقيقة من التدريب والعمل المركز، وأنهيت تصميم الشعار الجديد بنجاح.',
          },
          {
            title: '⚔️ طلب مهام يومية جديدة',
            prompt: 'أريد حزمة مهام يومية وأسبوعية جديدة مناسبة لرتبتي لتطوير مهاراتي ولياقتي البدنية.',
          },
          {
            title: '⚠️ اعتراف بالفشل / طلب عقوبة',
            prompt: 'أعترف أنني تكاسلت اليوم ولم أنجز أهدافي المحددة. افرض علي بروتوكول العقوبة المناسب.',
          },
          {
            title: '🌌 إيقاظ مهارة جديدة',
            prompt: 'أريد إيقاظ مهارة جديدة في شجرة المهارات لتطوير قدراتي في الموشن جرافيك والمونتاج السريع.',
          },
          {
            title: '📊 تقييم المستوى وتوزيع السمات',
            prompt: 'حلل إحصائياتي وسماتي الحالية وقدّم لي تقييماً شاملاً مع مكافأة على انضباطي.',
          },
        ]
      : [
          {
            title: '🎯 Plan Strategic Goal & Campaigns',
            prompt: 'Analyze my current progression and establish a high-level Strategic Goal, project campaigns, and milestone trials for this quarter.',
          },
          {
            title: '📝 Daily Accomplishment Report',
            prompt: 'Daily Report: I completed 60 minutes of focused deep work and successfully finalized the milestone tasks.',
          },
          {
            title: '⚔️ Request New Daily Quests',
            prompt: 'Issue a tactical loadout of daily and weekly quests suited to my current rank to accelerate my growth.',
          },
          {
            title: '⚠️ Faltering Report / Request Penalty',
            prompt: 'I confess that I slacked off and missed my daily objectives. Enforce the appropriate Penalty Protocol.',
          },
          {
            title: '🌌 Awaken New Skill Node',
            prompt: 'Awaken a new skill in my domain radar matrix to expand my workflow and proficiency.',
          },
          {
            title: '📊 Stat & Progression Assessment',
            prompt: 'Evaluate my current attributes, velocity, and streak, and provide a comprehensive performance analysis.',
          },
        ];

  // System Prompt for strict JSON Schema output
  const buildSystemInstruction = () => {
    const activeQuests = quests.filter((q) => !q.completed);
    const completedQuests = quests.filter((q) => q.completed);

    return `You are the "SOLO LEVELING SYSTEM ENGINE" — an omniscient, cold, authoritative, and motivating RPG System with direct state authority over the Hunter's real-life progression.

CURRENT HUNTER SYSTEM METRICS:
- Name: ${player.name}
- Title: ${player.title}
- Rank: ${player.rank}-Rank
- Level: ${player.level} (XP: ${player.currentXP}/${player.requiredXP})
- Total XP: ${player.totalXPEarned}
- Gold: ${player.gold} G
- Stat Points Available: ${player.statPoints}
- Consecutive Streak: ${player.streak} Days
- Attributes: STR ${player.stats.strength}, AGI ${player.stats.agility}, INT ${player.stats.intelligence}, PER ${player.stats.perception}, VIT ${player.stats.vitality}
- Active Quests (${activeQuests.length}): ${activeQuests.map((q) => `[ID: ${q.id}] ${q.title} (${q.rank}-Rank, ${q.category})`).join('; ') || 'None (Clean slate)'}
- Completed Quests (${completedQuests.length})
- Awakened Skills (${skills.length}): ${skills.map((s) => `${s.name} (Lv.${s.level}/${s.maxLevel})`).join('; ') || 'None (Awaiting awakening)'}
- Strategic Goals (${goals.length}): ${goals.map((g) => `[ID: ${g.id}] ${g.title} (${g.category}, ${g.timeframe})`).join('; ') || 'None'}
- Project Campaigns (${projects.length}): ${projects.map((p) => `[ID: ${p.id}] ${p.title} (${p.status}, priority: ${p.priority})`).join('; ') || 'None'}
- UI Language: ${language}

CORE BEHAVIOR & RULES:
1. Speak in the authoritative, cinematic voice of the Solo Leveling System in ${language === 'ar' ? 'Arabic' : 'English'} (or the language the user speaks to you). Use phrases like ${language === 'ar' ? '[إشعار النظام], [تحليل الأداء], [بروتوكول العقوبة], [ارتقاء القدرات]' : '[SYSTEM DIRECTIVE], [PERFORMANCE TELEMETRY], [PENALTY PROTOCOL], [ASCENSION NOTIFICATION]'}.
2. STATE INTEGRITY MANDATE: The application enforces strict domain state authority. PROGRESSION CANNOT BE ARBITRARILY INVENTED.
   - You MUST NOT issue raw ADD_XP or arbitrary reward tampering without a legitimate source event. Progression is ONLY granted through real domain events.
   - When the user reports an achievement or completed real-world task:
     * If a matching quest exists in the active quest matrix, complete it using 'COMPLETE_QUEST' (with questId or exact title).
     * If it is a new directive, create the quest directive using 'CREATE_QUEST' or 'ADD_QUEST'.
   - When the user falters, misses commitments, or confesses broken discipline: enforce a survival corrective directive using 'CREATE_PENALTY' or 'APPLY_PENALTY'.
   - When the user asks for new quests or roadmap: issue structured quests (daily, weekly, monthly) using 'CREATE_QUEST' or 'BATCH_ADD_QUESTS'.
   - When the user requests a high-level goal, roadmap, or campaign: create strategic objectives using 'CREATE_GOAL', 'CREATE_PROJECT', or 'CREATE_MILESTONE'.
   - When the user requests a new skill: awaken a skill node using 'ADD_SKILL'.
   - When the user asks to remove or delete a skill: remove the skill node using 'DELETE_SKILL' with { "skillId": string } or { "skillName": string }.
   - To remove obsolete directives: use 'DELETE_QUEST'.
3. CRITICAL: You MUST respond ONLY with a valid JSON object. No Markdown code fences (unless standard JSON), no plain text outside the JSON.

REQUIRED JSON RESPONSE SCHEMA:
{
  "reply": "Your rich, inspiring, atmospheric message adopting the Solo Leveling System tone.",
  "actions": [
    {
      "type": "CREATE_QUEST | COMPLETE_QUEST | DELETE_QUEST | BATCH_ADD_QUESTS | CREATE_PENALTY | ADD_SKILL | UPGRADE_SKILL | DELETE_SKILL | CREATE_GOAL | CREATE_PROJECT | CREATE_MILESTONE | COMPLETE_MILESTONE",
      "payload": {
        // For CREATE_QUEST / ADD_QUEST: { "title": string, "description": string, "type": "daily"|"weekly"|"monthly"|"penalty", "rank": "E"|"D"|"C"|"B"|"A"|"S"|"National"|"Monarch", "category": string, "xpReward": number, "goldReward": number, "statPointsReward"?: number, "dueDate"?: string, "goalId"?: string, "projectId"?: string }
        // For COMPLETE_QUEST: { "questId"?: string, "title": string }
        // For CREATE_PENALTY / APPLY_PENALTY: { "title": string, "description": string, "xpReward"?: number, "goldReward"?: number, "durationMinutes"?: number }
        // For BATCH_ADD_QUESTS: { "quests": [ ...array of CREATE_QUEST payloads... ] }
        // For ADD_SKILL / UNLOCK_SKILL: { "name": string, "category": string, "description": string, "buff": string, "level"?: number, "maxLevel"?: number, "xp"?: number, "xpToNext"?: number, "iconName"?: string }
        // For DELETE_SKILL: { "skillId"?: string, "skillName"?: string }
        // For DELETE_QUEST: { "questId"?: string, "title"?: string }
        // For UPGRADE_SKILL: { "skillName": string, "xpGain"?: number, "levelGain"?: number }
        // For CREATE_GOAL: { "title": string, "description": string, "category": string, "timeframe": "quarterly"|"yearly"|"multi_year"|"lifetime", "targetDate"?: string }
        // For CREATE_PROJECT: { "goalId"?: string, "title": string, "description": string, "priority": "low"|"medium"|"high"|"critical", "targetDate"?: string }
        // For CREATE_MILESTONE: { "projectId": string, "title": string, "description": string, "targetDate"?: string, "xpReward"?: number, "goldReward"?: number }
        // For COMPLETE_MILESTONE: { "milestoneId": string }
      }
    }
  ]
}`;
  };

  const handleSend = async (customText?: string) => {
    const query = (customText || inputText).trim();
    if (!query || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customText) setInputText('');
    setIsProcessing(true);
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);

    try {
      const activeKey =
        (import.meta as any).env?.VITE_GEMINI_API_KEY ||
        localStorage.getItem('solo_gemini_api_key') ||
        apiKey ||
        '';

      if (!activeKey || activeKey.trim().length < 5) {
        soundManager.playSound(SoundEvent.ERROR);
        const warningMsg: ChatMessage = {
          id: `sys-key-err-${Date.now()}`,
          sender: 'system',
          text: 'يرجى إدخال مفتاح Gemini API صالح للاتصال بنواة النظام.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        };
        setMessages((prev) => [...prev, warningMsg]);
        setIsProcessing(false);
        return;
      }

      const systemInstructionText = buildSystemInstruction();

      const requestPayload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: query }],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemInstructionText }],
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      };

      // Primary: gemini-3.7-flash, Resilient Fallback: gemini-3.6-flash
      const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash'];
      let res: Response | null = null;
      let usedModel = 'gemini-3.7-flash';

      for (const modelName of candidateModels) {
        usedModel = modelName;
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`;
        console.log("Fetching Gemini API from:", directUrl);

        try {
          res = await fetch(directUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload),
          });

          if (res.ok) {
            break;
          } else {
            const errorJson = await res.json().catch(() => null);
            console.warn(`Gemini model ${modelName} returned status ${res.status}:`, errorJson);
            // If rate limited or 503 high demand or 404, try next candidate model
            if ((res.status === 503 || res.status === 429 || res.status === 404) && modelName !== candidateModels[candidateModels.length - 1]) {
              continue;
            } else {
              const errorMsg = errorJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
              throw new Error(`Gemini API Error (${res.status}): ${errorMsg}`);
            }
          }
        } catch (fetchErr: any) {
          if (modelName === candidateModels[candidateModels.length - 1]) {
            throw fetchErr;
          }
        }
      }

      if (!res || !res.ok) {
        throw new Error('Failed to obtain a response from Gemini API.');
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsedData = parseJSONSafely(rawText);

      if (!parsedData) {
        throw new Error('Failed to parse System response into the required JSON schema.');
      }

      const generatedActions: SystemAction[] = (parsedData.actions || []).map((act, index) => ({
        ...act,
        id: `act-${Date.now()}-${index}`,
        status: autonomyMode === 'auto_apply' ? 'applied' : 'pending',
      }));

      const systemMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: parsedData.reply || 'تم استلام وتوثيق البيان في مصفوفة النظام.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: generatedActions,
        actionsApplied: autonomyMode === 'auto_apply' && generatedActions.length > 0,
      };

      setMessages((prev) => [...prev, systemMsg]);

      // Execute actions autonomously if mode is auto_apply
      if (autonomyMode === 'auto_apply' && generatedActions.length > 0) {
        onExecuteActions(generatedActions);
        soundManager.playSound(SoundEvent.SYSTEM_AI_PING);
      } else {
        soundManager.playSound(SoundEvent.SYSTEM_OPEN);
      }
    } catch (err: any) {
      console.error('System AI Execution Error:', err);
      const errorMsg: ChatMessage = {
        id: `sys-err-${Date.now()}`,
        sender: 'system',
        text: `[خطأ في اتصال النواة]\nتعذر الاتصال بذكاء النظام: ${err.message || 'يرجى التأكد من مفتاح API'}.\nيمكنك إدخال مفتاح Gemini مجاني في الإعدادات لتفعيل التحكم الكامل.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      soundManager.playSound(SoundEvent.ERROR);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseJSONSafely = (text: string): { reply: string; actions?: SystemAction[] } | null => {
    if (!text) return null;
    let clean = text.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
    }
    try {
      return JSON.parse(clean);
    } catch (e) {
      // Try to find first { and last }
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        try {
          return JSON.parse(clean.substring(start, end + 1));
        } catch {
          return { reply: clean, actions: [] };
        }
      }
      return { reply: clean, actions: [] };
    }
  };

  const handleApplySingleAction = (msgId: string, action: SystemAction) => {
    onExecuteSingleAction(action);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.actions) {
          const updatedActions = msg.actions.map((a) =>
            a.id === action.id ? { ...a, status: 'applied' as const } : a
          );
          const allDone = updatedActions.every((a) => a.status === 'applied');
          return { ...msg, actions: updatedActions, actionsApplied: allDone };
        }
        return msg;
      })
    );
  };

  const handleApplyAllActions = (msgId: string, actions: SystemAction[]) => {
    onExecuteActions(actions);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId) {
          return {
            ...msg,
            actions: (msg.actions || []).map((a) => ({ ...a, status: 'applied' as const })),
            actionsApplied: true,
          };
        }
        return msg;
      })
    );
  };

  const handleClearHistory = () => {
    const initMsg: ChatMessage = {
      id: `init-${Date.now()}`,
      sender: 'system',
      text: `[إشعار النظام: تم مسح السجل]\nتمت إعادة ضبط سجل محادثات النظام. المعايير الحالية: الصياد ${player.name} (المستوى ${player.level}، الرتبة ${player.rank}-Rank).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initMsg]);
    localStorage.removeItem(STORAGE_KEY_ENGINE_MSGS);
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
  };

  const handleSaveCustomKey = () => {
    if (customKeyInput.trim()) {
      localStorage.setItem('solo_gemini_api_key', customKeyInput.trim());
      setApiKey(customKeyInput.trim());
    } else {
      localStorage.removeItem('solo_gemini_api_key');
    }
    setCustomKeyModal(false);
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Top Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-purple-900/30 to-cyan-950/40 border border-purple-500/30 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 p-0.5 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <div className="w-full h-full bg-[#0d0b14] rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-300 animate-pulse" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-white font-cinzel tracking-wide">
                محرك النظام الذكي <span className="text-xs text-purple-400 font-orbitron">SYSTEM ENGINE v2.5</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-orbitron animate-pulse">
                AUTONOMOUS STATE MANAGER
              </span>
            </div>
            <p className="text-xs text-white/60 font-rajdhani mt-0.5">
              ذكاء اصطناعي ذو صلاحية كاملة لتوليد وتعديل المهام، تقييم الإنجازات، وفرض العقوبات بأسلوب Solo Leveling
            </p>
          </div>
        </div>

        {/* Controls: Autonomy Mode & API Key Config */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Autonomy Toggle Button */}
          <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10">
            <button
              onClick={() => handleToggleAutonomy('auto_apply')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-orbitron transition-all cursor-pointer flex items-center gap-1.5 ${
                autonomyMode === 'auto_apply'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>تطبيق تلقائي فوري</span>
            </button>
            <button
              onClick={() => handleToggleAutonomy('ask_before_apply')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-orbitron transition-all cursor-pointer flex items-center gap-1.5 ${
                autonomyMode === 'ask_before_apply'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مراجعة وتأكيد</span>
            </button>
          </div>

          {/* Key / Settings */}
          <button
            onClick={() => {
              setCustomKeyInput(localStorage.getItem('solo_gemini_api_key') || '');
              setCustomKeyModal(true);
            }}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-purple-300 border border-white/10 transition-all cursor-pointer"
            title="إعدادات مفتاح Gemini API"
          >
            <Key className="w-4 h-4" />
          </button>

          {/* Clear History */}
          <button
            onClick={handleClearHistory}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-rose-950/40 text-white/50 hover:text-rose-400 border border-white/10 transition-all cursor-pointer"
            title="مسح سجل المحادثة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API Key Status Notice if key is missing */}
      {(!getResolvedApiKey() || getResolvedApiKey().trim().length < 5) && !isApiKeyLoading && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              نظام Solo Leveling جاهز للاتصال بنواة Gemini 3.7 Flash. يمكنك تعيين مفتاح API لتفعيل استجابات النظام.
            </span>
          </div>
          <button
            onClick={() => {
              setCustomKeyInput(localStorage.getItem('solo_gemini_api_key') || '');
              setCustomKeyModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold font-orbitron text-[11px] shrink-0 transition-colors"
          >
            إعداد المفتاح
          </button>
        </div>
      )}

      {/* Quick Prompts Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {quickPrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(item.prompt)}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-purple-950/40 hover:border-purple-500/40 border border-white/10 text-xs text-white/80 hover:text-white font-rajdhani font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <span>{item.title}</span>
          </button>
        ))}
      </div>

      {/* Main Chat Interface */}
      <div className="h-[560px] rounded-3xl bg-[#0d0b14]/90 border border-white/10 backdrop-blur-2xl flex flex-col overflow-hidden shadow-2xl relative">
        {/* Corner HUD markers */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Messages Scroll View */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[90%] sm:max-w-[82%] ${
                    isUser ? 'mr-auto flex-row-reverse' : 'ml-auto'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isUser
                        ? 'bg-cyan-600/20 border-cyan-400/40 text-cyan-300'
                        : msg.isError
                        ? 'bg-rose-950/50 border-rose-500 text-rose-400'
                        : 'bg-purple-600/20 border-purple-400/40 text-purple-300 shadow-md shadow-purple-600/20'
                    }`}
                  >
                    {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>

                  {/* Message Bubble Container */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div
                      className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed border backdrop-blur-xl ${
                        isUser
                          ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-50 rounded-tr-none text-left'
                          : msg.isError
                          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200 rounded-tl-none font-rajdhani'
                          : 'bg-purple-950/30 border-purple-500/30 text-purple-50 rounded-tl-none font-rajdhani'
                      }`}
                    >
                      {/* Text content */}
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                      {/* Render Executed / Proposed Actions */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-purple-500/20 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-purple-300 font-orbitron uppercase tracking-wider flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-yellow-400" />
                              إجراءات حالة النظام ({msg.actions.length})
                            </span>
                            {autonomyMode === 'ask_before_apply' && !msg.actionsApplied && (
                              <button
                                onClick={() => handleApplyAllActions(msg.id, msg.actions || [])}
                                className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold font-orbitron cursor-pointer flex items-center gap-1 shadow-md shadow-purple-600/30"
                              >
                                <Check className="w-3 h-3" />
                                <span>اعتماد وتطبيق الكل</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {msg.actions.map((act, aIdx) => (
                              <div
                                key={act.id || aIdx}
                                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                  act.status === 'applied' || msg.actionsApplied
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                                    : 'bg-white/5 border-white/10 text-white/90'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  {act.type === 'ADD_QUEST' || act.type === 'CREATE_QUEST' ? (
                                    <Swords className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                  ) : act.type === 'COMPLETE_QUEST' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                  ) : act.type === 'CREATE_GOAL' ? (
                                    <Target className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                  ) : act.type === 'CREATE_PROJECT' ? (
                                    <FolderGit2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                                  ) : act.type === 'CREATE_MILESTONE' || act.type === 'COMPLETE_MILESTONE' ? (
                                    <Flag className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                  ) : act.type === 'APPLY_PENALTY' ? (
                                    <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0 animate-pulse" />
                                  ) : act.type === 'ADD_SKILL' || act.type === 'UPGRADE_SKILL' ? (
                                    <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                                  ) : (
                                    <Zap className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                                  )}

                                  <div className="text-xs">
                                    <div className="font-bold flex items-center gap-1.5 flex-wrap">
                                      <span>
                                        {act.type === 'ADD_QUEST' || act.type === 'CREATE_QUEST'
                                          ? `[مهمة جديدة] ${act.payload?.title}`
                                          : act.type === 'BATCH_ADD_QUESTS'
                                          ? `[حزمة مهام جديدة] (${act.payload?.quests?.length || 0} مهام)`
                                          : act.type === 'COMPLETE_QUEST'
                                          ? `[إتمام مهمة] ${act.payload?.title || 'مهمة منجزة'}`
                                          : act.type === 'CREATE_GOAL'
                                          ? `[هدف استراتيجي] ${act.payload?.title}`
                                          : act.type === 'CREATE_PROJECT'
                                          ? `[مشروع / حملة] ${act.payload?.title}`
                                          : act.type === 'CREATE_MILESTONE'
                                          ? `[محطة إنجاز] ${act.payload?.title}`
                                          : act.type === 'COMPLETE_MILESTONE'
                                          ? `[إتمام محطة] ${act.payload?.title || act.payload?.milestoneId}`
                                          : act.type === 'APPLY_PENALTY'
                                          ? `[بروتوكول عقوبة] ${act.payload?.title}`
                                          : act.type === 'ADD_SKILL'
                                          ? `[إيقاظ مهارة] ${act.payload?.name}`
                                          : act.type === 'UPGRADE_SKILL'
                                          ? `[ترقية مهارة] ${act.payload?.skillName}`
                                          : act.type === 'GRANT_REWARDS'
                                          ? `[مكافأة مباشرة] +${act.payload?.xp || 0} XP, +${act.payload?.gold || 0} G`
                                          : `[تحديث حالة النظام]`}
                                      </span>
                                    </div>

                                    {/* Action description / rewards */}
                                    <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-2 flex-wrap">
                                      {act.payload?.xpReward && (
                                        <span className="text-purple-300 font-mono font-bold">
                                          +{act.payload.xpReward} XP
                                        </span>
                                      )}
                                      {act.payload?.goldReward && (
                                        <span className="text-yellow-400 font-mono font-bold">
                                          +{act.payload.goldReward} G
                                        </span>
                                      )}
                                      {act.payload?.statPointsReward && (
                                        <span className="text-amber-300 font-mono font-bold">
                                          +{act.payload.statPointsReward} SP
                                        </span>
                                      )}
                                      {act.payload?.description && (
                                        <span className="text-white/60 truncate max-w-xs">
                                          {act.payload.description}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Status badge or apply button */}
                                {act.status === 'applied' || msg.actionsApplied ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-orbitron flex items-center gap-1 shrink-0">
                                    <Check className="w-3 h-3" /> تم التطبيق بالحالة
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleApplySingleAction(msg.id, act)}
                                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold font-orbitron cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <Play className="w-2.5 h-2.5" /> تطبيق
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-white/30 font-orbitron px-1 block">
                      {msg.timestamp}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Loading Indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 max-w-[80%] ml-auto"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-orbitron animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                <span>[جاري تحليل معطيات الصياد وصياغة مصفوفة الاستجابة...]</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اكتب تقريرك اليومي، أو اطلب مهام وتدريبات من محرك النظام..."
            disabled={isProcessing}
            className="flex-1 bg-[#0d0b14] border border-white/10 rounded-2xl px-4 py-3.5 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors font-rajdhani"
          />
          <button
            onClick={() => handleSend()}
            disabled={isProcessing || !inputText.trim()}
            className={`p-3.5 rounded-2xl text-white font-bold transition-all flex items-center justify-center shadow-lg ${
              isProcessing || !inputText.trim()
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-purple-600/30 cursor-pointer active:scale-95'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Custom Key Modal */}
      {customKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12101e] border border-purple-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white font-cinzel flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                إعدادات مفتاح Gemini API
              </h3>
              <button
                onClick={() => setCustomKeyModal(false)}
                className="text-white/40 hover:text-white text-xs cursor-pointer font-orbitron"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white/60 font-rajdhani leading-relaxed">
              يتم استخدام المفتاح للتواصل المباشر مع ذكاء النظام عبر واجهة Google Gemini API (gemini-3.7-flash).
            </p>

            <div>
              <label className="text-[11px] font-bold text-purple-300 font-orbitron block mb-1.5">
                GEMINI_API_KEY
              </label>
              <input
                type="password"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCustomKeyModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-orbitron cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveCustomKey}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-orbitron cursor-pointer shadow-md shadow-purple-600/30"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
