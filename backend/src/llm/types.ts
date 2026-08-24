import type {
  LLMEvaluationRequest as EvaluationLLMEvaluationRequest,
  LLMEvaluationResponse as EvaluationLLMEvaluationResponse,
  LLMProvider as EvaluationLLMProvider,
} from "../evaluation/types.js";

/**
 * Source supplied to the LLM reasoning engine.
 */
export interface LLMReasoningSource {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Request used by the reasoning flow.
 */
export interface LLMReasoningRequest {
  subject: string;
  assumption: string;
  sources: LLMReasoningSource[];
}

/**
 * Response returned by the reasoning flow.
 */
export interface LLMReasoningResponse {
  assessment: string;
  confidence: number;
  reasoning: string;
  keyFindings: string[];
  evidenceRequirements: string[];
}

/**
 * Evaluation types are owned by the evaluation domain.
 *
 * Re-export them here so existing imports from llm/types.ts
 * remain compatible without maintaining duplicate definitions.
 */
export type LLMEvaluationRequest = EvaluationLLMEvaluationRequest;

export type LLMEvaluationResponse = EvaluationLLMEvaluationResponse;

/**
 * LLM provider contract.
 */
export type LLMProvider = EvaluationLLMProvider;
