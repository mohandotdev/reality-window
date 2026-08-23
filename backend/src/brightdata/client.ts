import { bdclient } from "@brightdata/sdk";

import type {
  BrightDataClientOptions,
  BrightDataSearchOptions,
  BrightDataSearchResult,
  BrightDataScraperOptions,
  BrightDataScraperResult,
} from "./types.js";

export class BrightDataClient {
  private readonly client: bdclient;

  constructor(options: BrightDataClientOptions = {}) {
    const apiKey = options.apiToken ?? process.env["BRIGHT_DATA_API_KEY"];

    if (!apiKey) {
      throw new Error("BRIGHT_DATA_API_KEY is not configured");
    }

    this.client = new bdclient({
      apiKey,
    });
  }

  /**
   * Search the web using Bright Data SERP API.
   */
  async search(
    query: string,
    options: BrightDataSearchOptions = {},
  ): Promise<BrightDataSearchResult[]> {
    if (!query.trim()) {
      throw new Error("Search query is required");
    }

    const result = await this.client.search.google(query, {
      format: "json",
      ...(options.country ? { country: options.country } : {}),
      ...(options.timeout ? { timeout: options.timeout } : {}),
    });

    console.dir(result, { depth: null });

    return this.normalizeSearchResults(result);
  }

  /**
   * Search multiple queries.
   */
  async searchMany(
    queries: string[],
    options: BrightDataSearchOptions = {},
  ): Promise<BrightDataSearchResult[]> {
    const uniqueQueries = [
      ...new Set(queries.map((query) => query.trim()).filter(Boolean)),
    ];

    if (uniqueQueries.length === 0) {
      return [];
    }

    const results = await Promise.all(
      uniqueQueries.map((query) => this.search(query, options)),
    );

    return this.deduplicateResults(results.flat());
  }

  /**
   * Run an existing Bright Data Scraper Studio collector.
   */
  async runScraper(
    options: BrightDataScraperOptions,
  ): Promise<BrightDataScraperResult> {
    if (!options.collectorId.trim()) {
      throw new Error("Collector ID is required");
    }

    if (!options.url.trim()) {
      throw new Error("Scraper URL is required");
    }

    const results = await this.client.scraperStudio.run(options.collectorId, {
      input: {
        url: options.url,
      },
    });

    return {
      data: results,
    };
  }

  /**
   * Release SDK resources.
   */
  async close(): Promise<void> {
    await this.client.close();
  }

  private normalizeSearchResults(response: unknown): BrightDataSearchResult[] {
    if (!Array.isArray(response)) {
      return [];
    }

    return response
      .map((item): BrightDataSearchResult | null => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;

        const title =
          typeof record["title"] === "string" ? record["title"] : "";

        const url =
          typeof record["link"] === "string"
            ? record["link"]
            : typeof record["url"] === "string"
              ? record["url"]
              : "";

        const description =
          typeof record["description"] === "string"
            ? record["description"]
            : undefined;

        if (!title || !url) {
          return null;
        }

        return {
          title,
          url,
          ...(description ? { description } : {}),
        };
      })
      .filter((result): result is BrightDataSearchResult => result !== null);
  }

  private deduplicateResults(
    results: BrightDataSearchResult[],
  ): BrightDataSearchResult[] {
    const seen = new Set<string>();
    const unique: BrightDataSearchResult[] = [];

    for (const result of results) {
      if (seen.has(result.url)) {
        continue;
      }

      seen.add(result.url);
      unique.push(result);
    }

    return unique;
  }
}
