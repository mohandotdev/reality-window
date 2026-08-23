import type { LLMReasoningRequest, LLMReasoningResponse } from "./types.js";
export interface LLMProvider {
  readonly name: string;

  reason(request: LLMReasoningRequest): Promise<LLMReasoningResponse>;
}
