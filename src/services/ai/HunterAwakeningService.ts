import { Quest, HunterAwakeningAnswer, HunterAwakeningProfile } from '../../types';

const FALLBACK_QUESTIONS_EN = [
  {
    question: "What is the primary skill, craft, or domain you want to master through the System?",
    placeholder: "e.g., Full-Stack Development, Creative Design, Fitness & Strength, Academic Mastery...",
    category: "primary_goal"
  },
  {
    question: "What specific milestone or achievement would prove you've reached that next tier of mastery?",
    placeholder: "e.g., Launching my own product, landing a top-tier role, running a 10K, building a portfolio...",
    category: "milestone"
  },
  {
    question: "How much focused, deep work time can you realistically dedicate each day without burning out?",
    placeholder: "e.g., 60 minutes, 2 hours of deep work, 45 minutes daily...",
    category: "time_capacity"
  },
  {
    question: "Do you learn and progress best through structured daily drills, or by building hands-on projects?",
    placeholder: "e.g., Building real projects, structured step-by-step guides, intense weekly sprints...",
    category: "learning_style"
  },
  {
    question: "What is the biggest obstacle or friction point that usually slows your momentum down?",
    placeholder: "e.g., Procrastination, lack of clear roadmap, distractions, inconsistent energy...",
    category: "challenges"
  },
  {
    question: "What identity, alias, or title would you like the System to recognize you by?",
    placeholder: "e.g., Jin-Woo, Alex, Shadow Coder, Vanguard...",
    category: "identity"
  }
];

const FALLBACK_QUESTIONS_AR = [
  {
    question: "ما هو المجال أو المهارة الأساسية التي ترغب في صقلها والوصول فيها إلى مستوى النخبة؟",
    placeholder: "مثال: البرمجة وتطوير الأنظمة، التصميم الإبداعي، اللياقة البدنية، التفوق الأكاديمي...",
    category: "primary_goal"
  },
  {
    question: "ما هو الإنجاز أو المحطة المحددة التي إذا حققتها ستشعر بأنك كسرت حاجز مستواك الحالي؟",
    placeholder: "مثال: إطلاق مشروعي الخاص، الحصول على وظيفة أحلامي، بناء معرض أعمال قوي...",
    category: "milestone"
  },
  {
    question: "كم ساعة أو دقيقة من التركيز العميق غير المنقطع يمكنك تخصيصها يومياً دون إجهاد مفرط؟",
    placeholder: "مثال: 90 دقيقة، ساعتان يومياً، 45 دقيقة من العمل العميق...",
    category: "time_capacity"
  },
  {
    question: "كيف تفضل التقدم والتعلم: عبر تمارين يومية منظمة، أم من خلال خوض مشاريع عملية وتجربة الأخطاء؟",
    placeholder: "مثال: بناء مشاريع عملية، اتباع منهج منظم، جلسات تركيز مكثفة...",
    category: "learning_style"
  },
  {
    question: "ما هو التحدي أو العائق الأكبر الذي يعيقك عادة عن الاستمرار والوصول إلى أقصى طاقتك؟",
    placeholder: "مثال: التشتت، التسويف، غياب الخطة اليومية الواضحة، تذبذب الطاقة...",
    category: "challenges"
  },
  {
    question: "ما هو الاسم أو اللقب الذي ترغب أن يخاطبك به النظام أثناء رحلتك نحو القمة؟",
    placeholder: "مثال: جون وو، أحمد، المطور المجهول، قائد الظلال...",
    category: "identity"
  }
];

export class HunterAwakeningService {
  private static getActiveApiKey(customKey?: string): string {
    return (
      customKey ||
      localStorage.getItem('solo_gemini_api_key') ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (import.meta as any).env?.GEMINI_API_KEY ||
      ''
    );
  }

  /**
   * Generates the first or next discovery question tailored dynamically to prior answers
   */
  public static async generateNextQuestion(
    history: HunterAwakeningAnswer[],
    language: 'en' | 'ar',
    customKey?: string
  ): Promise<{
    question: string;
    isReadyForAnalysis: boolean;
    category?: string;
    placeholder?: string;
  }> {
    const apiKey = this.getActiveApiKey(customKey);
    const stepCount = history.length;

    // If 6 or more high quality answers, the system can offer readiness
    const canConclude = stepCount >= 5;

    if (!apiKey || apiKey.trim().length < 5) {
      // Fallback
      return this.getFallbackQuestion(stepCount, language);
    }

    const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash'];
    const isArabic = language === 'ar';

    const systemPrompt = isArabic
      ? `أنت نظام صحوة الصياد (The Solo System Protocol).
مهمتك إجراء مقابلة استكشافية تفاعلية غامضة وشخصية مع الصياد المستيقظ حديثاً لتحديد هويته وأهدافه وتحدياته ونمط تعلمه وقدرته الزمنية اليومية.

قواعد المقابلة:
1. صِغ السؤال بأسلوب نظام RPG متطور وغامض ومحفز، موجه بالكامل إلى التطوير الذاتي والإنتاجية وصقل المهارات والتركيز.
2. ابنِ السؤال التالي مباشرة وبدقة على إجابات الصياد السابقة، لتبدو المقابلة وكأن النظام يحلل عقله وهدفه الحقيقي.
3. تجنب تماماً الأسئلة الحساسة أو التطفلية أو غير اللائقة.
4. مدة المقابلة بين 5 إلى 8 أسئلة نوعية.
5. إذا جمعت معلومات كافية عن هدفه الرئيسي، محطته المستهدفة، ساعاته اليومية، أسلوب تعلمه، وتحدياته، اجعل "isReadyForAnalysis": true.
6. الإخراج يجب أن يكون كائن JSON صالح فقط بدون أي وسوم ماركداون زائدة بالصيغة التالية:
{
  "question": "نص السؤال باللغة العربية بأسلوب النظام",
  "category": "goals | milestone | learning_style | time_capacity | challenges | identity",
  "placeholder": "نص إرشادي مختصر لمربع الإدخال",
  "isReadyForAnalysis": boolean
}`
      : `You are the Hunter Awakening Protocol (The Solo System).
Your mission is to conduct a mysterious, deeply personal, and highly engaging discovery interview with the newly awakened Hunter to identify their primary goals, milestones, learning style, daily time capacity, challenges, and aspirations.

Interview Rules:
1. Frame the question in an immersive, futuristic RPG System interface voice — sleek, mysterious, focused on self-mastery, high productivity, and skill leveling.
2. Dynamically formulate the next question based directly on the Hunter's previous answers so the interview feels genuinely adaptive and observant.
3. Never ask for sensitive personal or invasive data.
4. Total interview is 5 to 8 focused questions.
5. If you have gathered sufficient context (primary craft/goal, desired milestone, daily time availability, learning style, main obstacle), set "isReadyForAnalysis": true.
6. Output MUST be strictly a single valid JSON object without markdown wrapper:
{
  "question": "The question string in English in the System voice",
  "category": "goals | milestone | learning_style | time_capacity | challenges | identity",
  "placeholder": "Short helpful placeholder for the input box",
  "isReadyForAnalysis": boolean
}`;

    const conversationHistory = history.map((item, idx) => ({
      role: 'model',
      parts: [{ text: `Step ${idx + 1} Question: "${item.questionText}"\nHunter's Answer: "${item.answerText}"` }]
    }));

    const currentPrompt = history.length === 0
      ? (isArabic
          ? 'ابدأ المقابلة بالسؤال الافتتاحي الأول لاكتشاف المجال الأساسي الذي يرغب الصياد في تطويره والسيادة فيه.'
          : 'Initiate the awakening interview with the first foundational question to discover the primary domain the Hunter wants to conquer.')
      : (isArabic
          ? `عدد الإجابات الحالية: ${history.length}. حلل الإجابة الأخيرة وصغ السؤال المناسب التالي بذكاء. هل وصلنا لمرحلة التحليل النهائي؟`
          : `Current step count: ${history.length}. Analyze the latest answer and generate the next intelligent follow-up question. Is it ready for final analysis?`);

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: currentPrompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    };

    for (const modelName of candidateModels) {
      try {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const res = await fetch(directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const raw = await res.json();
          const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return {
              question: parsed.question || this.getFallbackQuestion(stepCount, language).question,
              isReadyForAnalysis: stepCount >= 7 ? true : Boolean(parsed.isReadyForAnalysis && canConclude),
              category: parsed.category || 'general',
              placeholder: parsed.placeholder || ''
            };
          }
        }
      } catch (e) {
        console.warn(`HunterAwakening question generation failed on ${modelName}:`, e);
      }
    }

    return this.getFallbackQuestion(stepCount, language);
  }

  /**
   * Generates the Hunter profile & custom initial quests based on the full interview
   */
  public static async analyzeHunterProfile(
    history: HunterAwakeningAnswer[],
    language: 'en' | 'ar',
    customKey?: string
  ): Promise<HunterAwakeningProfile> {
    const apiKey = this.getActiveApiKey(customKey);
    const isArabic = language === 'ar';

    if (!apiKey || apiKey.trim().length < 5) {
      return this.getFallbackProfile(history, language);
    }

    const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash'];

    const systemPrompt = isArabic
      ? `أنت نواة نظام الذكاء الاصطناعي (System AI Core) لبروتوكول يقظة الصياد.
بناءً على إجابات الصياد المستيقظ في المقابلة، أنتج تحليلاً استراتيجياً لشخصية وتطلعات الصياد مع اقتراح باقة من 3 إلى 5 مهام ابتدائية واقعية ومحفزة.

القواعد:
1. الرتبة الابتدائية هي دائماً E-Rank، حيث يعكس النظام فلسفة التطور التدريجي من الصفر إلى قمة الرتب.
2. استخرج أو اقترح اسماً/لقباً مناسباً، ومساراً رئيسياً (Primary Path) يلخص تخصصه.
3. اقترح توزيعاً أولياً لنقاط القوة الخمس (Strength, Agility, Intelligence, Perception, Vitality) تتراوح كل منها بين 10 و14 نقطة بحسب طبيعة مجاله.
4. اقترح 3 إلى 5 مهام أولية تشمل: مهمة تدريب يومية (Daily Trial)، مهمة غارة أسبوعية (Weekly Raid)، ومهمة تركيز عميق.
5. الإخراج يجب أن يكون JSON مطابق تماماً للهيكل التالي:
{
  "preferredName": "اسم الصياد",
  "title": "لقب الصياد (مثل: E-Rank Sovereign Initiate)",
  "primaryPath": "المسار الأساسي (مثل: هندسة البرمجيات والأنظمة)",
  "primaryGoal": "الهدف الأسمى",
  "secondaryGoals": ["هدف فرعي 1", "هدف فرعي 2"],
  "interests": ["اهتمام 1", "اهتمام 2"],
  "learningStyle": "نمط التعلم المستخلص",
  "dailyAvailableMinutes": 90,
  "questPreference": "progressive",
  "recommendedFocusAreas": ["مجال تركيز 1", "مجال تركيز 2"],
  "suggestedStats": {
    "strength": 10,
    "agility": 11,
    "intelligence": 13,
    "perception": 12,
    "vitality": 10
  },
  "suggestedSkills": [
    {
      "name": "اسم المهارة المقترحة",
      "description": "وصف المهارة",
      "buff": "+5% Focus Efficiency",
      "category": "Coding | Study | Motion Design | Fitness | Life"
    }
  ],
  "initialQuests": [
    {
      "id": "init-quest-1",
      "title": "عنوان المهمة",
      "description": "تفاصيل المهمة وخطوات تنفيذها بدقة",
      "type": "daily",
      "rank": "E",
      "xpReward": 35,
      "goldReward": 50,
      "category": "Coding",
      "completed": false,
      "targetCount": 1,
      "currentCount": 0,
      "unit": "session"
    }
  ]
}`
      : `You are the System AI Core for the Hunter Awakening Protocol.
Based on the answers provided by the newly awakened Hunter during discovery, generate a comprehensive strategic profile and propose 3 to 5 realistic, high-impact initial quests.

Rules:
1. The initial rank is always E-Rank, reflecting the RPG progression philosophy of ascending from the baseline.
2. Derive a fitting preferred alias, a primary path title, and extract primary & secondary goals.
3. Propose base stat distribution across Strength, Agility, Intelligence, Perception, Vitality (each 10-14).
4. Propose 3 to 5 initial quests: a Daily Trial, a Weekly Raid, and a Habit/Focus quest based strictly on the user's stated goals and available daily minutes.
5. Output MUST be strictly valid JSON matching this schema:
{
  "preferredName": "Hunter Name or Alias",
  "title": "E-Rank Hunter Title",
  "primaryPath": "Primary Path Summary",
  "primaryGoal": "Primary Goal",
  "secondaryGoals": ["Goal 1", "Goal 2"],
  "interests": ["Interest 1", "Interest 2"],
  "learningStyle": "Identified Learning Style",
  "dailyAvailableMinutes": 90,
  "questPreference": "progressive",
  "recommendedFocusAreas": ["Focus 1", "Focus 2"],
  "suggestedStats": {
    "strength": 10,
    "agility": 11,
    "intelligence": 13,
    "perception": 12,
    "vitality": 10
  },
  "suggestedSkills": [
    {
      "name": "Skill Name",
      "description": "Skill Description",
      "buff": "+5% Focus Efficiency",
      "category": "Coding | Study | Motion Design | Fitness | Life"
    }
  ],
  "initialQuests": [
    {
      "id": "init-quest-1",
      "title": "Quest Title",
      "description": "Detailed quest steps and clear objective",
      "type": "daily",
      "rank": "E",
      "xpReward": 35,
      "goldReward": 50,
      "category": "Coding",
      "completed": false,
      "targetCount": 1,
      "currentCount": 0,
      "unit": "session"
    }
  ]
}`;

    const answersSummary = history
      .map((item, idx) => `Q${idx + 1} (${item.category || 'general'}): "${item.questionText}"\nA: "${item.answerText}"`)
      .join('\n\n');

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'user',
          parts: [{ text: `Here are the Hunter's discovery interview answers:\n\n${answersSummary}\n\nGenerate the complete structured Hunter Profile and initial quest suite now.` }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6
      }
    };

    for (const modelName of candidateModels) {
      try {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const res = await fetch(directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const raw = await res.json();
          const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return this.sanitizeProfile(parsed, history, language);
          }
        }
      } catch (e) {
        console.warn(`Hunter profile analysis failed on ${modelName}:`, e);
      }
    }

    return this.getFallbackProfile(history, language);
  }

  private static sanitizeProfile(
    parsed: any,
    history: HunterAwakeningAnswer[],
    language: 'en' | 'ar'
  ): HunterAwakeningProfile {
    const isArabic = language === 'ar';
    const fallback = this.getFallbackProfile(history, language);

    const safeQuests: Quest[] = Array.isArray(parsed.initialQuests) && parsed.initialQuests.length > 0
      ? parsed.initialQuests.map((q: any, i: number) => ({
          id: q.id || `init-quest-${Date.now()}-${i}`,
          title: q.title || (isArabic ? `مهمة النظام ${i + 1}` : `System Quest ${i + 1}`),
          description: q.description || '',
          type: (['daily', 'weekly', 'monthly', 'penalty', 'boss'].includes(q.type) ? q.type : 'daily') as any,
          rank: 'E' as const,
          xpReward: typeof q.xpReward === 'number' ? Math.max(10, Math.min(150, q.xpReward)) : 35,
          goldReward: typeof q.goldReward === 'number' ? Math.max(10, Math.min(200, q.goldReward)) : 50,
          category: q.category || (isArabic ? 'تطوير' : 'General'),
          completed: false,
          targetCount: q.targetCount || 1,
          currentCount: 0,
          unit: q.unit || (isArabic ? 'جلسة' : 'session')
        }))
      : fallback.initialQuests;

    return {
      preferredName: parsed.preferredName?.trim() || fallback.preferredName,
      title: parsed.title?.trim() || fallback.title,
      primaryPath: parsed.primaryPath?.trim() || fallback.primaryPath,
      primaryGoal: parsed.primaryGoal?.trim() || fallback.primaryGoal,
      secondaryGoals: Array.isArray(parsed.secondaryGoals) ? parsed.secondaryGoals : fallback.secondaryGoals,
      interests: Array.isArray(parsed.interests) ? parsed.interests : fallback.interests,
      learningStyle: parsed.learningStyle?.trim() || fallback.learningStyle,
      dailyAvailableMinutes: typeof parsed.dailyAvailableMinutes === 'number' ? parsed.dailyAvailableMinutes : fallback.dailyAvailableMinutes,
      questPreference: parsed.questPreference || 'progressive',
      recommendedFocusAreas: Array.isArray(parsed.recommendedFocusAreas) ? parsed.recommendedFocusAreas : fallback.recommendedFocusAreas,
      suggestedStats: {
        strength: parsed.suggestedStats?.strength || 10,
        agility: parsed.suggestedStats?.agility || 10,
        intelligence: parsed.suggestedStats?.intelligence || 12,
        perception: parsed.suggestedStats?.perception || 11,
        vitality: parsed.suggestedStats?.vitality || 10
      },
      suggestedSkills: Array.isArray(parsed.suggestedSkills) && parsed.suggestedSkills.length > 0
        ? parsed.suggestedSkills
        : fallback.suggestedSkills,
      initialQuests: safeQuests
    };
  }

  public static getFallbackQuestion(
    step: number,
    language: 'en' | 'ar'
  ): {
    question: string;
    isReadyForAnalysis: boolean;
    category?: string;
    placeholder?: string;
  } {
    const list = language === 'ar' ? FALLBACK_QUESTIONS_AR : FALLBACK_QUESTIONS_EN;
    const clampedIndex = Math.min(step, list.length - 1);
    const item = list[clampedIndex];

    return {
      question: item.question,
      category: item.category,
      placeholder: item.placeholder,
      isReadyForAnalysis: step >= list.length - 1
    };
  }

  public static getFallbackProfile(
    history: HunterAwakeningAnswer[],
    language: 'en' | 'ar'
  ): HunterAwakeningProfile {
    const isArabic = language === 'ar';
    const primaryAnswer = history.find(h => h.category === 'primary_goal' || h.questionId === '0')?.answerText || (isArabic ? 'تطوير المهارات' : 'Mastery of Craft');
    const nameAnswer = history.find(h => h.category === 'identity')?.answerText || (isArabic ? 'صياد مستيقظ' : 'Awakened Hunter');
    const hoursAnswer = history.find(h => h.category === 'time_capacity')?.answerText || '60';

    const dailyMinutes = hoursAnswer.includes('2') || hoursAnswer.includes('ساع') ? 120 : 60;

    return {
      preferredName: nameAnswer.trim() || (isArabic ? 'صياد النخبة' : 'Sung Jin-Woo'),
      title: isArabic ? 'E-Rank صياد مستيقظ' : 'E-Rank Awakened Initiate',
      primaryPath: primaryAnswer.slice(0, 40),
      primaryGoal: primaryAnswer,
      secondaryGoals: isArabic
        ? ['بناء روتين عمل عميق مستقر', 'صقل المهارات الأساسية يومياً']
        : ['Establish Consistent Deep Focus', 'Master Core Fundamentals Daily'],
      interests: isArabic ? ['التطوير المستمر', 'الإنتاجية القصوى'] : ['Skill Progression', 'Peak Productivity'],
      learningStyle: isArabic ? 'تطبيق عملي ومشاريع متدرجة' : 'Project-Based Iteration',
      dailyAvailableMinutes: dailyMinutes,
      questPreference: 'progressive',
      recommendedFocusAreas: isArabic ? ['العمل العميق', 'بناء العادات'] : ['Deep Work', 'Habit Stacking'],
      suggestedStats: {
        strength: 10,
        agility: 10,
        intelligence: 12,
        perception: 11,
        vitality: 10
      },
      suggestedSkills: [
        {
          name: isArabic ? 'تركيز الراهب' : 'Deep Work State',
          description: isArabic ? 'تعزيز القدرة على الانغماس الذهني دون تشتت' : 'Enhanced resistance against mental fatigue and distractions',
          buff: '+5% Focus Efficiency',
          category: 'General'
        }
      ],
      initialQuests: [
        {
          id: `init-quest-1-${Date.now()}`,
          title: isArabic ? `جلسة تركيز أولى: ${primaryAnswer.slice(0, 25)}` : `Foundational Session: ${primaryAnswer.slice(0, 25)}`,
          description: isArabic ? 'ابدأ أول جلسة عمل عميق لمدة 30 دقيقة لتحقيق الخطوة الأولى في مسارك.' : 'Execute your first 30-minute uninterrupted deep focus session.',
          type: 'daily',
          rank: 'E',
          xpReward: 30,
          goldReward: 40,
          category: isArabic ? 'تركيز' : 'Focus',
          completed: false,
          targetCount: 1,
          currentCount: 0,
          unit: isArabic ? 'جلسة' : 'session'
        },
        {
          id: `init-quest-2-${Date.now()}`,
          title: isArabic ? 'تحديد خريطة الطريق الأسبوعية' : 'Construct Weekly Strategic Roadmap',
          description: isArabic ? 'قسم هدفك الرئيسي إلى 3 مهام محددة قابلة للقياس خلال الأسبوع الحالي.' : 'Deconstruct your primary objective into 3 actionable milestones for this week.',
          type: 'daily',
          rank: 'E',
          xpReward: 35,
          goldReward: 50,
          category: isArabic ? 'تخطيط' : 'General',
          completed: false,
          targetCount: 1,
          currentCount: 0,
          unit: isArabic ? 'خطة' : 'plan'
        },
        {
          id: `init-quest-3-${Date.now()}`,
          title: isArabic ? 'غارة الإنجاز الأسبوعية' : 'Weekly Breakthrough Raid',
          description: isArabic ? 'أكمل 3 ساعات عمل عميق تراكمية على مشروعك الأساسي هذا الأسبوع.' : 'Accumulate 3 hours of logged deep work on your main project this week.',
          type: 'weekly',
          rank: 'E',
          xpReward: 100,
          goldReward: 150,
          category: isArabic ? 'تطوير' : 'Progression',
          completed: false,
          targetCount: 3,
          currentCount: 0,
          unit: isArabic ? 'ساعة' : 'hours'
        }
      ]
    };
  }
}
