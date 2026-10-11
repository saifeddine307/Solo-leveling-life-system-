import { AIProvider, AIHealthStatus, SendMessageParams, AIResponse } from "./types";

/**
 * LocalProvider (Architecture Slot for Future Local Model / Offline Fallback)
 * Allows offline or local on-device inference when connected in future builds.
 */
export class LocalProvider implements AIProvider {
  id = "local";
  name = "Local System Core (Offline Stub)";

  async checkHealth(): Promise<AIHealthStatus> {
    return {
      online: false,
      provider: "local",
      hasApiKey: true,
      model: "local-sl-system-v1",
      error: "Local Model slot is reserved for future on-device inference modules.",
    };
  }

  async sendMessage(params: SendMessageParams): Promise<AIResponse> {
    const isAr = params.language === "ar";
    return {
      text: isAr
        ? `[نظام التطوير المحلي - تنبيه]\nالنموذج المحلي غير متصل حالياً. يتم تشغيل النظام الذكي عبر مزود Gemini Core.`
        : `[SYSTEM LOCAL CORE - NOTICE]\nLocal on-device inference is not active. Use the server-side Gemini Core provider for intelligent analysis.`,
      timestamp: new Date().toISOString(),
      isOffline: true,
    };
  }
}
