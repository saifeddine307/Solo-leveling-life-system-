import { AIProvider, AIHealthStatus, SendMessageParams, AIResponse } from "./types";

export class GeminiProvider implements AIProvider {
  id = "gemini";
  name = "Gemini Autonomous System Engine";

  async checkHealth(): Promise<AIHealthStatus> {
    const localKey =
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      localStorage.getItem("solo_gemini_api_key") ||
      "";

    const hasValidKey = !!localKey && localKey.trim().length >= 5;
    return {
      online: hasValidKey,
      provider: "gemini",
      hasApiKey: hasValidKey,
      model: "gemini-3.7-flash",
    };
  }

  async sendMessage(params: SendMessageParams): Promise<AIResponse> {
    const activeKey =
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      localStorage.getItem("solo_gemini_api_key") ||
      "";

    if (!activeKey || activeKey.trim().length < 5) {
      throw new Error("يرجى إدخال مفتاح Gemini API صالح للاتصال بنواة النظام");
    }

    const candidateModels = ["gemini-3.7-flash", "gemini-3.6-flash"];
    let res: Response | null = null;

    const requestPayload = {
      contents: [
        ...params.history.map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        })),
        {
          role: "user",
          parts: [{ text: params.message }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    };

    for (const modelName of candidateModels) {
      const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`;
      console.log("Fetching Gemini API from:", directUrl);

      try {
        res = await fetch(directUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });

        if (res.ok) {
          break;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`Gemini model ${modelName} returned status ${res.status}:`, errData);
          if ((res.status === 503 || res.status === 429 || res.status === 404) && modelName !== candidateModels[candidateModels.length - 1]) {
            continue;
          } else {
            const errorMsg = errData?.error?.message || `System AI core returned HTTP ${res.status}: ${res.statusText}`;
            throw new Error(`Gemini API Error (${res.status}): ${errorMsg}`);
          }
        }
      } catch (err: any) {
        if (modelName === candidateModels[candidateModels.length - 1]) {
          throw err;
        }
      }
    }

    if (!res || !res.ok) {
      throw new Error("Failed to receive response from Gemini API");
    }

    const raw = await res.json();
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { reply: text };
    }

    return {
      text: parsed.reply || text,
      timestamp: new Date().toISOString(),
      autonomyMode: params.autonomyMode,
    };
  }
}
