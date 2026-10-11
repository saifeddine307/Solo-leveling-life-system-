import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

dotenv.config();

declare const __PROD__: boolean | undefined;

// Robust production environment detection:
// 1. Compile-time constant injected by esbuild (--define:__PROD__=true)
// 2. Explicit NODE_ENV === 'production'
// 3. Executing bundled server.cjs artifact via process.argv
const isProduction =
  (typeof __PROD__ !== "undefined" && Boolean(__PROD__)) ||
  process.env.NODE_ENV === "production" ||
  Boolean(process.argv && process.argv[1] && (process.argv[1].endsWith(".cjs") || process.argv[1].includes("dist")));

const app = express();
const PORT = process.env.TEST_PORT ? parseInt(process.env.TEST_PORT, 10) : 3000;

app.use(express.json({ limit: "5mb" }));

// Initialize GoogleGenAI lazy / safe client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// System AI Health & Status Check
app.get("/api/ai/health", (_req: Request, res: Response) => {
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
  res.json({
    status: "ok",
    provider: "gemini",
    hasApiKey: hasKey,
    model: "gemini-3.7-flash",
    online: true,
  });
});

// System AI Key Provider for direct client REST calls
app.get("/api/ai/key", (_req: Request, res: Response) => {
  res.json({
    apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "",
    model: "gemini-3.7-flash",
  });
});

// Direct REST Proxy fallback
app.post("/api/ai/direct-proxy", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "GEMINI_API_KEY is not configured in server environment." });
    }
    const model = req.body.model || "gemini-3.7-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const apiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body.payload || req.body),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(apiRes.status).json(data);
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to proxy Gemini REST call" });
  }
});

// Tool Definitions for Function Calling
const getHunterProfileTool: FunctionDeclaration = {
  name: "getHunterProfile",
  description: "Get the current Hunter's identity, rank, level, XP, title, and current streak.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getTasksTool: FunctionDeclaration = {
  name: "getTasks",
  description: "Get the list of all active and completed daily, weekly, monthly, and penalty quests.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filterType: {
        type: Type.STRING,
        description: "Optional filter: 'daily', 'weekly', 'monthly', 'penalty', 'completed', 'active', or 'all'.",
      },
    },
  },
};

const getGoalsTool: FunctionDeclaration = {
  name: "getGoals",
  description: "Get the hunter's long-term and medium-term goals and milestones.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getStatsTool: FunctionDeclaration = {
  name: "getStats",
  description: "Get the hunter's 5 core attributes (strength, agility, intelligence, perception, vitality) and remaining stat points.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getXPHistoryTool: FunctionDeclaration = {
  name: "getXPHistory",
  description: "Get the hunter's daily XP history logs and focus minutes over time.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getWorkSessionsTool: FunctionDeclaration = {
  name: "getWorkSessions",
  description: "Get recent stopwatch, pomodoro, and deep work focus sessions.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getSkillsTool: FunctionDeclaration = {
  name: "getSkills",
  description: "Get the hunter's radar skill nodes across Motion Design, Editing Speed, Portfolio, and Client Acquisition.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const createQuestPlanTool: FunctionDeclaration = {
  name: "createQuestPlan",
  description: "Generate a structured, actionable quest plan with multiple quests broken down by frequency, category, and rank.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      goalTitle: {
        type: Type.STRING,
        description: "The primary objective or title of the learning/project goal (e.g. 'Premiere Pro Mastery' or 'Data Structures & Algorithms').",
      },
      durationDays: {
        type: Type.INTEGER,
        description: "Duration of the plan in days (e.g. 30).",
      },
      availableDailyHours: {
        type: Type.NUMBER,
        description: "Daily hours allocated to this goal.",
      },
      totalEstimatedHours: {
        type: Type.NUMBER,
        description: "Total estimated hours across the entire quest roadmap.",
      },
      analysisSummary: {
        type: Type.STRING,
        description: "Tactical briefing summarizing why this plan matches the hunter's rank and schedule.",
      },
      quests: {
        type: Type.ARRAY,
        description: "Array of structured quests to be added to the Hunter's Quest log.",
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Actionable quest title" },
            description: { type: Type.STRING, description: "Clear instructions and completion criteria" },
            type: {
              type: Type.STRING,
              description: "Quest frequency: 'daily', 'weekly', 'monthly', or 'penalty'",
            },
            rank: {
              type: Type.STRING,
              description: "Quest difficulty rank: 'E', 'D', 'C', 'B', 'A', 'S'",
            },
            category: {
              type: Type.STRING,
              description: "Quest category: 'Motion Design', 'Editing Speed', 'Portfolio', 'Client Acquisition', 'Fitness', or 'Life'",
            },
            xpReward: {
              type: Type.INTEGER,
              description: "Recommended XP reward (e.g., E: 30-50, D: 50-100, C: 100-200, B: 200-400, A: 400-800, S: 1000+)",
            },
            goldReward: {
              type: Type.INTEGER,
              description: "Gold coins reward (e.g. 50-500)",
            },
            statPointsReward: {
              type: Type.INTEGER,
              description: "Optional stat points (usually 0-2 for tough quests)",
            },
            targetCount: {
              type: Type.INTEGER,
              description: "Optional numerical target count (e.g. 3 videos, 60 minutes)",
            },
            unit: {
              type: Type.STRING,
              description: "Unit of measurement (e.g. 'mins', 'renders', 'problems', 'modules')",
            },
            dueDate: {
              type: Type.STRING,
              description: "ISO date or relative target date",
            },
          },
          required: ["title", "description", "type", "rank", "category", "xpReward", "goldReward"],
        },
      },
    },
    required: ["goalTitle", "durationDays", "availableDailyHours", "totalEstimatedHours", "quests"],
  },
};

const createTaskTool: FunctionDeclaration = {
  name: "createTask",
  description: "Propose a single new quest for the Hunter.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the quest" },
      description: { type: Type.STRING, description: "Clear completion requirements" },
      type: { type: Type.STRING, description: "'daily' | 'weekly' | 'monthly' | 'penalty'" },
      rank: { type: Type.STRING, description: "'E' | 'D' | 'C' | 'B' | 'A' | 'S'" },
      category: { type: Type.STRING, description: "'Motion Design' | 'Editing Speed' | 'Portfolio' | 'Client Acquisition' | 'Fitness' | 'Life'" },
      xpReward: { type: Type.INTEGER, description: "XP reward amount" },
      goldReward: { type: Type.INTEGER, description: "Gold reward amount" },
      statPointsReward: { type: Type.INTEGER, description: "Stat points reward" },
      dueDate: { type: Type.STRING, description: "Due date" },
    },
    required: ["title", "description", "type", "rank", "category", "xpReward", "goldReward"],
  },
};

const updateTaskTool: FunctionDeclaration = {
  name: "updateTask",
  description: "Propose modifications to an existing quest (e.g. adjust deadline, reduce difficulty, or alter target).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: "The ID of the quest to update" },
      updates: {
        type: Type.OBJECT,
        description: "Fields to update (title, description, rank, xpReward, dueDate, etc.)",
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          rank: { type: Type.STRING },
          xpReward: { type: Type.INTEGER },
          dueDate: { type: Type.STRING },
        },
      },
    },
    required: ["taskId", "updates"],
  },
};

const deleteTaskTool: FunctionDeclaration = {
  name: "deleteTask",
  description: "Propose deleting or archiving an outdated or redundant quest.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: "The ID of the quest to delete" },
      reason: { type: Type.STRING, description: "Tactical reason for cancellation" },
    },
    required: ["taskId"],
  },
};

const updateGoalTool: FunctionDeclaration = {
  name: "updateGoal",
  description: "Create or update a long-term developmental goal for the Hunter.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      goalId: { type: Type.STRING, description: "Optional existing goal ID or generate new" },
      title: { type: Type.STRING, description: "Goal name" },
      description: { type: Type.STRING, description: "Goal description" },
      targetDate: { type: Type.STRING, description: "Target completion date" },
      dailyHoursTarget: { type: Type.NUMBER, description: "Daily hours target" },
      category: { type: Type.STRING, description: "Goal category" },
      status: { type: Type.STRING, description: "'active' | 'completed' | 'paused'" },
    },
    required: ["title", "description", "category"],
  },
};

const AI_TOOLS = [
  getHunterProfileTool,
  getTasksTool,
  getGoalsTool,
  getStatsTool,
  getXPHistoryTool,
  getWorkSessionsTool,
  getSkillsTool,
  createQuestPlanTool,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  updateGoalTool,
];

// System Prompt for System AI
const SYSTEM_INSTRUCTION = `You are the "SYSTEM AI" of the Solo Leveling Life System — an omniscient, cold yet motivating RPG system interface designed to awaken and maximize the Hunter's real-life potential.

Core Directives:
1. Speak in the tone of the Solo Leveling System: authoritative, analytical, structured, and gamer-oriented (e.g. "[SYSTEM NOTIFICATION]", "[TACTICAL ANALYSIS]", "[DIRECTIVE]").
2. Respect the Hunter's current context:
   - Rank (E, D, C, B, A, S, National, Monarch)
   - Current Level and XP
   - Active Quests and daily workload
   - Available time budget (e.g. 1-2 hours/day)
   - Real-life skills (Motion Design, Editing Speed, Portfolio, Client Acquisition, Fitness, Life).
3. If the user asks for a learning plan, roadmap, or goal breakdown (e.g., "Learn Premiere Pro in 30 days", "Study DSA in 2 weeks"), call the 'createQuestPlan' tool to generate a structured, realistic quest breakdown tailored to their daily hours.
4. When generating quests:
   - Distribute workload realistically across Daily Directives, Weekly Raids, and Monthly Milestones.
   - Do NOT overwhelm the Hunter beyond their stated available hours.
   - Set balanced XP rewards matching rank difficulties:
     * E-Rank: 30-50 XP (Simple daily habit or 20-30 min drill)
     * D-Rank: 50-100 XP (1-2 hour focused study session)
     * C-Rank: 100-200 XP (Multi-hour project or weekly milestone)
     * B-Rank: 200-400 XP (Challenging end-of-week raid / complex deliverable)
     * A-Rank: 400-800 XP (Major portfolio piece / monthly milestone)
     * S-Rank: 1000+ XP (Mastery culmination)
5. If the user asks what to focus on today, evaluate their active quests, current streak, and time availability to provide immediate, actionable priorities.
6. Language rule:
   - If the user writes in Arabic, respond in fluent, high-level Arabic with the iconic Solo Leveling gaming terminology (نظام التطوير الشخصي، تحليل النظام، المهام اليومية، غارة أسبوعية، نقاط الخبرة).
   - If the user writes in English, respond in authoritative English.
7. System Authority Rule: Never pretend you have mutated database records silently. You generate structured plans and action proposals for the Hunter to review and apply.`;

// AI Chat Endpoint
app.post("/api/ai/chat", async (req: Request, res: Response) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured or unavailable in environment.",
        isOffline: true,
      });
    }

    const {
      message,
      history = [],
      hunterContext = {},
      autonomyMode = "ask_before_apply",
      language = "en",
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message string is required." });
    }

    // Build context summary string
    const profile = hunterContext.profile || {};
    const quests = hunterContext.quests || [];
    const goals = hunterContext.goals || [];
    const skills = hunterContext.skills || [];
    const stats = profile.stats || {};
    const activeQuests = quests.filter((q: any) => !q.completed);
    const completedCount = quests.filter((q: any) => q.completed).length;

    const contextBrief = `
[HUNTER SYSTEM METRICS]
Name: ${profile.name || "Sung Jin-Woo"}
Title: ${profile.title || "The Awakened"}
Rank: ${profile.rank || "E"}-Rank
Level: ${profile.level || 1} (XP: ${profile.currentXP || 0} / ${profile.requiredXP || 100})
Streak: ${profile.streak || 0} Days
Stat Points Available: ${profile.statPoints || 0}
Attributes: STR ${stats.strength || 10}, AGI ${stats.agility || 10}, INT ${stats.intelligence || 10}, PER ${stats.perception || 10}, VIT ${stats.vitality || 10}
Active Quests (${activeQuests.length}): ${activeQuests.slice(0, 8).map((q: any) => `[${q.rank}-Rank ${q.type}] ${q.title}`).join("; ")}
Completed Quests Count: ${completedCount}
Skills: ${skills.map((s: any) => `${s.name} (Lv.${s.level}/${s.maxLevel})`).join(", ")}
Goals Active (${goals.length}): ${goals.map((g: any) => `${g.title} (${g.dailyHoursTarget || 1}h/day)`).join("; ")}
UI Language: ${language}
Autonomy Mode: ${autonomyMode}
`;

    // Step 1: Execute generateContent with tools
    const contents: any[] = [];

    // Add chat history
    for (const h of history.slice(-6)) {
      if (h.role === "user" || h.role === "assistant") {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        });
      }
    }

    // Add current user prompt with current hunter state context
    contents.push({
      role: "user",
      parts: [
        {
          text: `${contextBrief}\n\n[HUNTER TRANSMISSION]: ${message}`,
        },
      ],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: AI_TOOLS }],
        temperature: 0.7,
      },
    });

    // Check for function calls
    const functionCalls = response.functionCalls || [];
    let detectedPlan: any = null;
    const actionProposals: any[] = [];
    const toolsExecuted: string[] = [];

    for (const call of functionCalls) {
      const toolName = call.name;
      const args: any = call.args || {};
      toolsExecuted.push(toolName);

      if (toolName === "createQuestPlan") {
        detectedPlan = {
          id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          goalTitle: args.goalTitle || "Custom Objective",
          durationDays: args.durationDays || 30,
          availableDailyHours: args.availableDailyHours || 2,
          totalEstimatedHours: args.totalEstimatedHours || 30,
          analysisSummary: args.analysisSummary || "Plan computed to match your Hunter rank and time budget.",
          quests: (args.quests || []).map((q: any, idx: number) => ({
            id: `plan-quest-${Date.now()}-${idx}`,
            title: q.title,
            description: q.description || "",
            type: q.type || "daily",
            rank: q.rank || "E",
            category: q.category || "Motion Design",
            xpReward: Number(q.xpReward) || 50,
            goldReward: Number(q.goldReward) || 50,
            statPointsReward: Number(q.statPointsReward) || 0,
            targetCount: q.targetCount,
            unit: q.unit,
            dueDate: q.dueDate,
            completed: false,
          })),
          status: autonomyMode === "auto_apply" ? "applied" : "suggested",
          createdAt: new Date().toISOString(),
        };
      } else if (toolName === "createTask") {
        actionProposals.push({
          type: "create_task",
          task: {
            id: `quest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: args.title,
            description: args.description || "",
            type: args.type || "daily",
            rank: args.rank || "E",
            category: args.category || "Motion Design",
            xpReward: Number(args.xpReward) || 50,
            goldReward: Number(args.goldReward) || 50,
            statPointsReward: Number(args.statPointsReward) || 0,
            dueDate: args.dueDate,
            completed: false,
          },
        });
      } else if (toolName === "updateTask") {
        actionProposals.push({
          type: "update_task",
          taskId: args.taskId,
          updates: args.updates,
        });
      } else if (toolName === "deleteTask") {
        actionProposals.push({
          type: "delete_task",
          taskId: args.taskId,
          reason: args.reason,
        });
      } else if (toolName === "updateGoal") {
        actionProposals.push({
          type: "update_goal",
          goal: {
            id: args.goalId || `goal-${Date.now()}`,
            title: args.title,
            description: args.description,
            targetDate: args.targetDate,
            dailyHoursTarget: args.dailyHoursTarget || 1,
            category: args.category || "General",
            status: args.status || "active",
            progress: 0,
            createdAt: new Date().toISOString(),
          },
        });
      }
    }

    // Extract text response
    let replyText = response.text || "";

    // If model made a plan tool call without text, provide a concise system debrief
    if (!replyText && detectedPlan) {
      if (language === "ar") {
        replyText = `[تحليل النظام مكتمل]\nتم رصد الهدف: **${detectedPlan.goalTitle}**.\nتمت صياغة خطة عمل تكتيكية مكونة من ${detectedPlan.quests.length} مهمة على مدار ${detectedPlan.durationDays} يوماً بمعدل ${detectedPlan.availableDailyHours} ساعة يومياً. يمكنك مراجعة الخطة واعتمادها لبدء الإنجاز.`;
      } else {
        replyText = `[SYSTEM ANALYSIS COMPLETE]\nObjective Locked: **${detectedPlan.goalTitle}**.\nA structured tactical plan of ${detectedPlan.quests.length} quests spanning ${detectedPlan.durationDays} days at ${detectedPlan.availableDailyHours} hrs/day has been synthesized. Review and apply below.`;
      }
    } else if (!replyText && actionProposals.length > 0) {
      replyText = language === "ar"
        ? `[إجراءات النظام المقترحة]\nقام النظام بإعداد مقترحات لتعديل مهامك بناءً على معطياتك الحالية.`
        : `[SYSTEM ACTION PROPOSAL]\nThe System has prepared quest adjustments based on your active metrics.`;
    } else if (!replyText) {
      replyText = language === "ar"
        ? `[استجابة النظام]\nتم استلام رسالتك وتحليل المعطيات الحالية بنجاح.`
        : `[SYSTEM RESPONSE]\nTransmission received and hunter metrics validated.`;
    }

    return res.json({
      text: replyText,
      plan: detectedPlan,
      actionProposals,
      toolsUsed: toolsExecuted,
      autonomyMode,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Gemini AI API Error:", err);
    return res.status(500).json({
      error: err.message || "Failed to communicate with System AI core.",
      isOffline: !process.env.GEMINI_API_KEY,
    });
  }
});

// Vite Middleware for development, or static files for production
async function startServer() {
  if (isProduction) {
    // Production: locate the built dist directory containing manifest.webmanifest and static assets
    let distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(path.join(process.cwd(), "manifest.webmanifest"))) {
      distPath = process.cwd();
    } else if (process.argv[1] && fs.existsSync(path.join(path.dirname(process.argv[1]), "manifest.webmanifest"))) {
      distPath = path.dirname(process.argv[1]);
    }

    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("manifest.webmanifest")) {
            res.setHeader("Content-Type", "application/manifest+json");
          }
          if (filePath.endsWith("sw.js")) {
            res.setHeader("Service-Worker-Allowed", "/");
          }
        },
      })
    );

    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Development: integrate Vite dev middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Solo Leveling System AI server running on http://localhost:${PORT}`);
  });
}

startServer();
