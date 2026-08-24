/**
 * Backend HTTP contracts. These match Express responses, not the UI model.
 */

export type EvaluationVerdict = "STILL_TRUE" | "CHANGED" | "UNCERTAIN";

export type ScraperStatus =
  | "PENDING"
  | "CREATING"
  | "AI_FLOW_RUNNING"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "UNAVAILABLE";

export type ApiWatchSource = {
  title?: string;
  url?: string;
  snippet?: string;
};

export type ApiWatch = {
  id: string;
  subject: string;
  assumption: string;
  searchQueries?: unknown;
  sources?: unknown;
  evidenceRequirements?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type ApiScraper = {
  id: string;
  collectorId?: string | null;
  aiJobId?: string | null;
  collectionId?: string | null;
  status: string;
  target?: unknown;
  schema?: unknown;
  sampleData?: unknown;
  latestData?: unknown;
  approvedAt?: string | null;
  lastRunAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiEvidence = {
  claim: string;
  sourceText: string;
};

export type ApiChangedField = {
  field: string;
  previousValue?: unknown;
  currentValue?: unknown;
};

export type ApiEvaluation = {
  id: string;
  scraperId?: string;
  collectionId?: string | null;
  verdict: EvaluationVerdict | string;
  confidence?: number;
  reasoning: string;
  evidence: unknown;
  changedFields: unknown;
  createdAt: string;
};

export type WatchDetailResponse = {
  watch: ApiWatch;
  scraper: ApiScraper | null;
  evaluation: ApiEvaluation | null;
};

export type WatchListItemResponse = {
  id: string;
  subject: string;
  assumption: string;
  scraperStatus: string | null;
  collectionId: string | null;
  approvedAt: string | null;
  lastScraperUpdateAt: string | null;
  latestEvaluation: {
    verdict: EvaluationVerdict | string;
    createdAt: string;
    confidence: number;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type WatchListResponse = {
  watches: WatchListItemResponse[];
};

export type CreateWatchResponse = {
  watchId: string;
  plan?: {
    searchQueries?: string[];
    sources?: ApiWatchSource[];
    evidenceRequirements?: string[];
  };
  scraper: ApiScraper | null;
  reused: boolean;
};

export type ScraperEnvelope = {
  scraper: ApiScraper | null;
  reused?: boolean;
};

export type ScraperProgressResponse = {
  progress: unknown;
  scraper: ApiScraper | null;
};

export type EvaluateResponse = {
  evaluation: ApiEvaluation;
};

export type EvaluationsResponse = {
  evaluations: ApiEvaluation[];
};

export type ScraperRunResponse = {
  status: string;
  collectionId?: string;
};
