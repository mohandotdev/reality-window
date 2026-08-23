import { GoogleGenAI } from "@google/genai";
import { buildReasoningPrompt } from "../prompts.ts";
import {
  REASONING_SYSTEM_PROMPT,
  REASONING_RESPONSE_SCHEMA,
} from "../prompts.ts";
import { LLMService } from "../service.ts";

import type {
  LLMProvider,
  LLMReasoningRequest,
  LLMReasoningResponse,
} from "../types.js";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 30_000;

function readEnv(name: string): string | undefined {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return value.trim();
}

function redactSecrets(text: string): string {
  return text
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]")
    .replace(/GEMINI_API_KEY\s*=\s*\S+/gi, "GEMINI_API_KEY=[redacted]");
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if (
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return undefined;
}

function getErrorName(error: unknown): string {
  if (typeof error === "object" && error !== null && "name" in error) {
    return String(error.name);
  }

  return "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return redactSecrets(error.message);
  }

  return "Unknown Gemini provider error.";
}

function createProviderError(error: unknown): Error {
  const status = getErrorStatus(error);
  const name = getErrorName(error);
  const message = getErrorMessage(error);

  if (name === "TimeoutError" || name === "AbortError" || status === 408) {
    return new Error("Gemini request timed out.");
  }

  if (status === 429) {
    return new Error(
      "Gemini rate limit exceeded. Retry or use another provider.",
    );
  }

  if (status === 401 || status === 403) {
    return new Error(
      "Gemini rejected the request due to authentication or permission.",
    );
  }

  return new Error(`Gemini provider error: ${message}`);
}

interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

interface GeminiProviderDependencies {
  client?: Pick<GoogleGenAI, "models">;
}

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  private readonly client: Pick<GoogleGenAI, "models">;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    options: GeminiProviderOptions,
    dependencies: GeminiProviderDependencies = {},
  ) {
    const apiKey = options.apiKey.trim();

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing or empty.");
    }

    this.client =
      dependencies.client ??
      new GoogleGenAI({
        apiKey,
      });

    this.model = options.model ?? DEFAULT_MODEL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async reason(request: LLMReasoningRequest): Promise<LLMReasoningResponse> {
    const prompt = buildReasoningPrompt(request);

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,

        config: {
          systemInstruction: REASONING_SYSTEM_PROMPT,

          responseMimeType: "application/json",

          responseJsonSchema: REASONING_RESPONSE_SCHEMA,

          abortSignal: AbortSignal.timeout(this.timeoutMs),
        },
      });

      const text = response.text?.trim() ?? "";

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      return parseReasoningResponse(text);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Gemini returned an empty response."
      ) {
        throw error;
      }

      throw createProviderError(error);
    }
  }
}

function parseReasoningResponse(text: string): LLMReasoningResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON for the reasoning response.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Gemini returned an invalid reasoning response.");
  }

  const data = parsed as Record<string, unknown>;

  console.log("Gemini raw reasoning response:", JSON.stringify(data, null, 2));

  if (typeof data.assessment !== "string") {
    throw new Error("Gemini reasoning response is missing assessment.");
  }

  if (typeof data.confidence !== "number") {
    throw new Error("Gemini reasoning response is missing confidence.");
  }

  if (typeof data.reasoning !== "string") {
    throw new Error("Gemini reasoning response is missing reasoning.");
  }

  if (
    !Array.isArray(data.keyFindings) ||
    !data.keyFindings.every((item) => typeof item === "string")
  ) {
    throw new Error("Gemini reasoning response has invalid keyFindings.");
  }

  if (
    !Array.isArray(data.evidenceRequirements) ||
    !data.evidenceRequirements.every((item) => typeof item === "string")
  ) {
    throw new Error(
      "Gemini reasoning response has invalid EvidenceRequirements.",
    );
  }

  return {
    assessment: data.assessment,
    confidence: data.confidence,
    reasoning: data.reasoning,
    keyFindings: data.keyFindings,
    evidenceRequirements: data.evidenceRequirements,
  };
}

export function createGeminiProviderFromEnv(): GeminiProvider {
  const apiKey = readEnv("GEMINI_API_KEY");

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to your environment.");
  }

  const model = readEnv("GEMINI_MODEL");

  const timeoutValue = readEnv("GEMINI_TIMEOUT_MS");

  const timeoutMs = timeoutValue ? Number(timeoutValue) : DEFAULT_TIMEOUT_MS;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("GEMINI_TIMEOUT_MS must be a positive number.");
  }

  return new GeminiProvider({
    apiKey,

    ...(model
      ? {
          model,
        }
      : {}),

    timeoutMs,
  });
}

export {
  DEFAULT_MODEL as GEMINI_DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS as GEMINI_DEFAULT_TIMEOUT_MS,
};

export function createLLMServiceFromEnv(): LLMService {
  const gemini = createGeminiProviderFromEnv();

  return new LLMService({
    providers: [gemini],
    primaryProvider: "gemini",
    maxRetries: 1,
    retryDelayMs: 1000,
  });
}
