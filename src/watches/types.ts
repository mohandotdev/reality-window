export interface CreateWatchRequest {
  subject: string;
  assumption: string;
}

export interface WatchSource {
  title: string;
  url: string;
  snippet: string;
}

export interface WatchPlan {
  subject: string;
  assumption: string;

  searchQueries: string[];

  sources: WatchSource[];

  evidenceRequirements: string[];
}
