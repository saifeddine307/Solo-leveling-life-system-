import { AIProvider } from "./types";
import { GeminiProvider } from "./GeminiProvider";
import { LocalProvider } from "./LocalProvider";

export * from "./types";
export * from "./GeminiProvider";
export * from "./LocalProvider";

class AIServiceManager {
  private providers: Map<string, AIProvider> = new Map();
  private activeProviderId = "gemini";

  constructor() {
    const gemini = new GeminiProvider();
    const local = new LocalProvider();
    this.providers.set(gemini.id, gemini);
    this.providers.set(local.id, local);
  }

  getProvider(id?: string): AIProvider {
    const providerId = id || this.activeProviderId;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return this.providers.get("gemini")!;
    }
    return provider;
  }

  setActiveProvider(id: string) {
    if (this.providers.has(id)) {
      this.activeProviderId = id;
    }
  }

  getActiveProviderId(): string {
    return this.activeProviderId;
  }
}

export const aiService = new AIServiceManager();
