export interface BrightDataClientOptions {
  apiToken?: string;
}

export interface BrightDataSearchOptions {
  country?: string;
  timeout?: number;
}

export interface BrightDataSearchResult {
  title: string;
  url: string;
  description?: string;
}

export interface BrightDataScraperOptions {
  collectorId: string;
  url: string;
}

export interface BrightDataScraperResult {
  collectionId?: string;
  data: unknown;
}
