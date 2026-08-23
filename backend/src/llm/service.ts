import type {
  LLMProvider,
  LLMReasoningRequest,
  LLMReasoningResponse,
} from "./types.js";

import { createGeminiProviderFromEnv } from "./providers/gemini.js";

export interface LLMServiceOptions {
  /**
   * Registered LLM providers.
   *
   * The providers are attempted in the configured order.
   */
  providers: LLMProvider[];

  /**
   * Name of the preferred provider.
   *
   * Example:
   * "gemini"
   */
  primaryProvider?: string;

  /**
   * Number of retries for transient provider failures.
   *
   * Default: 1
   */
  maxRetries?: number;

  /**
   * Initial retry delay in milliseconds.
   *
   * Exponential backoff is applied:
   *
   * attempt 1 → retryDelayMs
   * attempt 2 → retryDelayMs * 2
   * attempt 3 → retryDelayMs * 4
   *
   * Default: 1000
   */
  retryDelayMs?: number;
}

export class LLMService {
  private readonly providers: LLMProvider[];
  private readonly primaryProvider?: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(options: LLMServiceOptions) {
    if (options.providers.length === 0) {
      throw new Error("At least one LLM provider is required.");
    }

    this.providers = options.providers;
    this.primaryProvider = options.primaryProvider;
    this.maxRetries = options.maxRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
  }

  /**
   * Send a reasoning request to the configured LLM providers.
   *
   * Flow:
   *
   * 1. Try primary provider.
   * 2. Retry transient failures.
   * 3. If the provider still fails, try the next provider.
   * 4. Continue until a provider succeeds.
   */
  async reason(request: LLMReasoningRequest): Promise<LLMReasoningResponse> {
    const providers = this.getOrderedProviders();

    let lastError: unknown;

    for (const provider of providers) {
      try {
        return await this.executeWithRetry(provider, request);
      } catch (error) {
        lastError = error;

        console.error(`LLM provider failed: ${provider.name}`, error);

        // Move to the next provider.
      }
    }

    throw new Error(
      `All LLM providers failed. Last error: ${getErrorMessage(lastError)}`,
    );
  }

  /**
   * Put the primary provider first.
   *
   * Example:
   *
   * primaryProvider = "gemini"
   *
   * providers:
   *   gemini
   *   deepseek
   *
   * Result:
   *   gemini → deepseek
   */
  private getOrderedProviders(): LLMProvider[] {
    if (!this.primaryProvider) {
      return [...this.providers];
    }

    const primary = this.providers.find(
      (provider) => provider.name === this.primaryProvider,
    );

    if (!primary) {
      throw new Error(
        `Primary LLM provider "${this.primaryProvider}" is not registered.`,
      );
    }

    const fallbackProviders = this.providers.filter(
      (provider) => provider.name !== this.primaryProvider,
    );

    return [primary, ...fallbackProviders];
  }

  /**
   * Execute one provider with retry + exponential backoff.
   */
  private async executeWithRetry(
    provider: LLMProvider,
    request: LLMReasoningRequest,
  ): Promise<LLMReasoningResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await provider.reason(request);
      } catch (error) {
        lastError = error;

        if (!isRetryableError(error)) {
          throw error;
        }

        const isLastAttempt = attempt === this.maxRetries;

        if (isLastAttempt) {
          break;
        }

        const delay = this.retryDelayMs * Math.pow(2, attempt);

        console.warn(
          `Retrying ${provider.name} in ${delay}ms ` +
            `(attempt ${attempt + 1}/${this.maxRetries})`,
        );

        await sleep(delay);
      }
    }

    throw lastError;
  }
}

/**
 * Determines whether a provider failure is worth retrying.
 *
 * These generally represent temporary infrastructure/provider
 * problems rather than invalid requests or authentication errors.
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("temporarily unavailable") ||
    message.includes("service unavailable") ||
    message.includes("internal server error") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown LLM error.";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Create the application-level LLM service.
 *
 * Currently:
 *
 *   Gemini
 *
 * Future:
 *
 *   Gemini → DeepSeek → another provider
 */
export function createLlmService(): LLMService {
  const gemini = createGeminiProviderFromEnv();

  return new LLMService({
    providers: [gemini],
    primaryProvider: "gemini",
    maxRetries: 1,
    retryDelayMs: 1000,
  });
}
