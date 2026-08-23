import type {
  AiFlowProgress,
  AiFlowTriggerResult,
  Collector,
  CollectorResult,
  CollectorTriggerResult,
  CreateCollectorRequest,
  RunCollectorRequest,
  ScraperTarget,
} from "./types.js";

interface BrightDataCollectorResponse {
  id: string;
  name?: string;
  active?: boolean;
}

interface BrightDataAiFlowResponse {
  id: string;
  queued: boolean;
}

interface BrightDataTriggerResponse {
  collection_id: string;
}

/**
 * Low-level Bright Data Scraper Studio adapter.
 *
 * Bright Data workflow:
 *
 * POST /dca/collector
 *        ↓
 * POST /dca/collectors/{collector_id}/automate_template
 *        ↓
 * GET /dca/collectors/{collector_id}/automate_template/progress
 *        ↓
 * POST /dca/trigger
 *        ↓
 * GET /dca/dataset
 */
export class ScraperStudio {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.brightdata.com";

  constructor(apiKey = process.env["BRIGHTDATA_API_KEY"] ?? "") {
    if (!apiKey.trim()) {
      throw new Error("BRIGHTDATA_API_KEY is missing.");
    }

    this.apiKey = apiKey.trim();
  }

  /**
   * Create the Scraper Studio collector/template entity.
   */
  async createCollector(request: CreateCollectorRequest): Promise<Collector> {
    const name = request.schema.name.trim();
    const targetUrl = request.target.url.trim();

    if (!name) {
      throw new Error("Scraper collector name is required.");
    }

    if (!targetUrl) {
      throw new Error("Scraper target URL is required.");
    }

    const response = await this.request<BrightDataCollectorResponse>(
      "/dca/collector",
      {
        method: "POST",
        body: JSON.stringify({
          name,
        }),
      },
    );

    if (!response.id) {
      throw new Error("Bright Data did not return a collector ID.");
    }

    return {
      collectorId: response.id,
      name: response.name ?? name,
      url: targetUrl,
      status: "CREATED",
    };
  }

  /**
   * Start Bright Data AI Flow.
   *
   * This generates the scraper implementation/schema.
   *
   * It does NOT mean Reality Window has approved the scraper.
   */
  async triggerAiFlow(
    collectorId: string,
    target: ScraperTarget,
  ): Promise<AiFlowTriggerResult> {
    const id = collectorId.trim();
    const url = target.url.trim();

    if (!id) {
      throw new Error("Collector ID is required.");
    }

    if (!url) {
      throw new Error("Scraper target URL is required.");
    }

    const description = [
      target.title,
      ...target.instructions,
      ...target.evidenceRequirements.map(
        (requirement) => `Evidence requirement: ${requirement}`,
      ),
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 500);

    const response = await this.request<BrightDataAiFlowResponse>(
      `/dca/collectors/${encodeURIComponent(id)}/automate_template`,
      {
        method: "POST",
        body: JSON.stringify({
          description,
          urls: [url],
        }),
      },
    );

    if (!response.id) {
      throw new Error("Bright Data did not return an AI Flow job ID.");
    }

    return {
      jobId: response.id,
      queued: response.queued,
    };
  }

  /**
   * Poll Bright Data AI Flow progress.
   */
  async getAiFlowProgress(collectorId: string): Promise<AiFlowProgress> {
    const id = collectorId.trim();

    if (!id) {
      throw new Error("Collector ID is required.");
    }

    const response = await this.request<Record<string, unknown>>(
      `/dca/collectors/${encodeURIComponent(id)}/automate_template/progress`,
      {
        method: "GET",
      },
    );

    return {
      ...response,

      status: typeof response.status === "string" ? response.status : "unknown",

      ...(typeof response.step === "string" ? { step: response.step } : {}),

      ...(Array.isArray(response.completed_steps)
        ? {
            completedSteps: response.completed_steps.filter(
              (item): item is string => typeof item === "string",
            ),
          }
        : {}),
    };
  }

  /**
   * Trigger an already-created/approved collector.
   *
   * Reality Window must enforce its own APPROVED state
   * before calling this method.
   */
  async triggerCollector(
    request: RunCollectorRequest,
    url: string,
  ): Promise<CollectorTriggerResult> {
    const collectorId = request.collectorId.trim();
    const targetUrl = url.trim();

    if (!collectorId) {
      throw new Error("Collector ID is required.");
    }

    if (!targetUrl) {
      throw new Error("Scraper target URL is required.");
    }

    const response = await this.request<BrightDataTriggerResponse>(
      `/dca/trigger?collector=${encodeURIComponent(collectorId)}&queue_next=1`,
      {
        method: "POST",
        body: JSON.stringify([
          {
            url: targetUrl,
          },
        ]),
      },
    );

    if (!response.collection_id) {
      throw new Error("Bright Data did not return a collection ID.");
    }

    return {
      collectionId: response.collection_id,
    };
  }

  /**
   * Retrieve the result of a collector execution.
   */
  async getDataset(collectionId: string): Promise<CollectorResult> {
    const id = collectionId.trim();

    if (!id) {
      throw new Error("Collection ID is required.");
    }

    const response = await this.request<unknown>(
      `/dca/dataset?id=${encodeURIComponent(id)}`,
      {
        method: "GET",
      },
    );

    return this.normalizeCollectorResult(id, response);
  }

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Bright Data request failed: ${response.status} ${response.statusText}${
          text ? ` - ${text}` : ""
        }`,
      );
    }

    if (!text.trim()) {
      throw new Error(`Bright Data returned an empty response for ${path}.`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Bright Data returned invalid JSON for ${path}.`);
    }
  }

  private normalizeCollectorResult(
    collectorId: string,
    data: unknown,
  ): CollectorResult {
    const normalizedData: Record<string, unknown>[] = Array.isArray(data)
      ? data.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null && !Array.isArray(item),
        )
      : [
          typeof data === "object" && data !== null && !Array.isArray(data)
            ? (data as Record<string, unknown>)
            : { result: data },
        ];

    return {
      collectorId,
      status: "COMPLETED",
      data: normalizedData,
      collectedAt: new Date().toISOString(),
    };
  }
}
