import type {
  LLMReasoningRequest,
  LLMReasoningResponse,
} from "../llm/types.js";

export type EvaluationVerdict = "STILL_TRUE" | "CHANGED" | "UNCERTAIN";

export interface EvaluationEvidence {
  claim: string;
  sourceText: string;
}

export interface ChangedField {
  field: string;
  previousValue?: unknown;
  currentValue?: unknown;
}

export interface RealityEvaluation {
  verdict: EvaluationVerdict;
  confidence: number;
  reasoning: string;
  evidence: EvaluationEvidence[];
  changedFields: ChangedField[];
}

export interface RealityEvaluationRequest {
  subject: string;
  assumption: string;
  evidenceRequirements: string[];
  latestData: unknown;

  previousEvaluation?: {
    verdict: EvaluationVerdict;
    confidence: number;
    reasoning: string;
    evidence: unknown;
    changedFields: unknown;
  };
}

/**
 * Request sent from the evaluation service to an LLM provider.
 *
 * This is intentionally owned by the evaluation layer because it
 * describes the business-level evaluation operation, not a specific
 * LLM provider.
 */
export interface LLMEvaluationRequest {
  subject: string;
  assumption: string;
  evidenceRequirements: string[];
  latestData: unknown;

  previousEvaluation?: {
    verdict: EvaluationVerdict;
    confidence: number;
    reasoning: string;
    evidence: unknown;
    changedFields: unknown;
  };
}

/**
 * Normalized response expected from an LLM provider.
 *
 * The provider response intentionally uses the same domain structure
 * as RealityEvaluation so the evaluation service does not need to
 * perform another lossy conversion.
 */
export interface LLMEvaluationResponse {
  verdict: EvaluationVerdict;
  confidence: number;
  reasoning: string;
  evidence: EvaluationEvidence[];
  changedFields: ChangedField[];
}

/**
 * LLM provider contract.
 *
 * Reasoning remains part of the existing LLM infrastructure while
 * evaluation is exposed through the same provider abstraction.
 */
export interface LLMProvider {
  readonly name: string;

  reason(request: LLMReasoningRequest): Promise<LLMReasoningResponse>;

  evaluate(request: LLMEvaluationRequest): Promise<LLMEvaluationResponse>;
}
