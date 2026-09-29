export interface CreateWatchRequest {
  subject: string;
  assumption: string;
}

export type SourceEligibility = "ELIGIBLE" | "EXCLUDED";

export interface WatchSource {
  title: string;
  url: string;
  snippet: string;

  eligibility: SourceEligibility;
  exclusionReason?: string;
}

export interface WatchPlan {
  subject: string;
  assumption: string;

  searchQueries: string[];

  sources: WatchSource[];

  evidenceRequirements: string[];
}
