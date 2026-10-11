import {
  AIMessage,
  AIAutonomyMode,
  PlayerStats,
  Quest,
  SkillNode,
  HunterGoal,
  XPHistoryEntry,
  WorkSession,
  UserSettings,
} from "../../types";

export interface HunterContextPayload {
  profile: PlayerStats;
  quests: Quest[];
  skills: SkillNode[];
  goals: HunterGoal[];
  history: XPHistoryEntry[];
  workSessions: WorkSession[];
  settings: UserSettings;
}

export interface SendMessageParams {
  message: string;
  history: AIMessage[];
  hunterContext: HunterContextPayload;
  autonomyMode: AIAutonomyMode;
  language: "en" | "ar";
}

export interface AIResponse {
  text: string;
  plan?: import("../../types").GeneratedQuestPlan;
  actionProposals?: Array<{
    type: "create_task" | "update_task" | "delete_task" | "update_goal";
    task?: Quest;
    taskId?: string;
    updates?: Partial<Quest>;
    reason?: string;
    goal?: HunterGoal;
  }>;
  toolsUsed?: string[];
  autonomyMode?: AIAutonomyMode;
  timestamp: string;
  isOffline?: boolean;
}

export interface AIHealthStatus {
  online: boolean;
  provider: string;
  hasApiKey: boolean;
  model: string;
  error?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  checkHealth(): Promise<AIHealthStatus>;
  sendMessage(params: SendMessageParams): Promise<AIResponse>;
}
