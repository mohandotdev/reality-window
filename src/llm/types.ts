export interface LLMReasoningRequest {
  subject: string;
  assumption: string;

  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface LLMReasoningResponse {
  assessment: string;
  confidence: number;
  reasoning: string;
  keyFindings: string[];
  evidenceRequirements: string[];
}

export interface LLMProvider {
  readonly name: string;

  reason(request: LLMReasoningRequest): Promise<LLMReasoningResponse>;
}

export type LLMErrorCode =
  | "MISSING_API_KEY"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "AUTH_ERROR"
  | "PROVIDER_ERROR"
  | "MALFORMED_RESPONSE";

export class LLMError extends Error {
  constructor(
    public readonly code: LLMErrorCode,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LLMError";
  }
}
