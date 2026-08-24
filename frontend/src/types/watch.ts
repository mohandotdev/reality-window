/**
 * Reality Window domain types.
 *
 * These are the *frontend* shapes. Raw backend payloads are translated into
 * these by the normalizers in `src/services/normalize.ts`, so no technical
 * backend state (AI_FLOW_RUNNING, COLLECTOR_CREATED, …) ever reaches the UI.
 */

/** Human-facing status of a watch or an evaluation. */
export type WatchStatus =
  | "unchecked"
  | "checking"
  | "still_true"
  | "changed"
  | "needs_review"
  | "failed";

/** Stage of the current run, used by the compact pipeline display. */
export type PipelineStage = "source" | "collect" | "evaluate" | "finding";

export type EvidenceItem = {
  id: string;
  /** What the evidence asserts. */
  claim?: string | undefined;
  /** Publisher / site name. */
  source?: string | undefined;
  sourceUrl?: string | undefined;
  /** Plain-text excerpt (never raw HTML). */
  excerpt?: string | undefined;
  /** Why this matters to the assumption. */
  relevance?: string | undefined;
};

export type SourceInfo = {
  name?: string | undefined;
  articleTitle?: string | undefined;
  url?: string | undefined;
  lastUpdated?: string | undefined;
};

export type Evaluation = {
  id: string;
  watchId: string;
  status: WatchStatus;
  stage: PipelineStage;
  /** One-line answer, e.g. "Your assumption is still supported." */
  headline: string;
  /** Short paragraph expanding on the headline. */
  summary?: string | undefined;
  /** Structured explanation returned by the backend (not chain-of-thought). */
  reasoning?: string[] | undefined;
  whatChanged?: string | undefined;
  whyItMatters?: string | undefined;
  evidence: EvidenceItem[];
  source?: SourceInfo | undefined;
  createdAt: string;
  /** Human-readable failure message, only for status === "failed". */
  error?: string | undefined;
};

export type Watch = {
  id: string;
  subject: string;
  assumption: string;
  sourceUrl?: string | undefined;
  status: WatchStatus;
  stage?: PipelineStage | undefined;
  createdAt: string;
  lastCheckedAt?: string | undefined;
  latestEvaluation?: Evaluation | undefined;
};

export type CreateWatchInput = {
  subject: string;
  assumption: string;
  sourceUrl?: string | undefined;
};

export const STATUS_LABEL: Record<WatchStatus, string> = {
  unchecked: "Not checked yet",
  checking: "Checking",
  still_true: "Still true",
  changed: "Something changed",
  needs_review: "Needs review",
  failed: "We couldn't complete the check",
};
