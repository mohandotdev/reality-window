import { LLMReasoningRequest, LLMReasoningResponse } from "./types";
export interface LLMProvider {
  readonly name: string;

  reason(request: LLMReasoningRequest): Promise<LLMReasoningResponse>;
}
