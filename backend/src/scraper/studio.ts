import type {
  AiFlowProgress,
  AiFlowTriggerResult,
  Collector,
  CollectorResult,
  CreateCollectorRequest,
  RunCollectorRequest,
  ScraperGenerationResult,
  ScraperSchema,
  ScraperTarget,
} from "./types.js";

interface BrightDataCollectorResponse {
  id?: string;
  collectorId?: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
}

interface BrightDataAiFlowResponse {
  id?: string;
  jobId?: string;
  queued?: boolean;
  [key: string]: unknown;
}

interface BrightDataAiFlowProgress {
  step?: string;
  completed_steps?: string[];
  status?: string;
  schema?: unknown;
  sampleData?: unknown;
  [key: string]: unknown;
}

interface BrightDataTriggerResponse {
  response_id?: string;
  collection_id?: string;
  collectionId?: string;
  status?: string;
  [key: string]: unknown;
}

export interface TriggerCollectorResult {
  collectorId: string;
  collectionId: string;
  status?: string;
  raw: BrightDataTriggerResponse;
}

export class ScraperStudio {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.brightdata.com";

  constructor(apiKey = process.env["BRIGHT_DATA_API_KEY"]) {
    if (!apiKey?.trim()) {
      throw new Error("BRIGHT_DATA_API_KEY is missing.");
    }

    this.apiKey = apiKey.trim();
  }

  generateScraperProposal(
    target: ScraperTarget,
    schema: ScraperSchema,
  ): ScraperGenerationResult {
    return {
      target,
      schema,
      collectorId: "",
      aiJobId: "",
      status: "PENDING",
    };
  }

  async createCollector(request: CreateCollectorRequest): Promise<Collector> {
    const targetUrl = request.target.url.trim();

    if (!targetUrl) {
      throw new Error("Scraper target URL is required.");
    }

    const collectorName = this.buildCollectorName(request.target);

    const webhookUrl = process.env["BRIGHT_DATA_WEBHOOK_URL"]?.trim();

    if (!webhookUrl) {
      throw new Error("BRIGHT_DATA_WEBHOOK_URL is missing.");
    }

    const response = await this.request<BrightDataCollectorResponse>(
      "/dca/collector",
      {
        method: "POST",
        body: {
          name: collectorName,

          deliver: {
            type: "webhook",

            filename: {
              template: `${collectorName}-{timestamp}`,
              extension: "json",
              tz_offset: "+00:00",
            },

            endpoint: webhookUrl,

            flatten_csv: false,

            delivery_type: "deliver_results",
          },
        },
      },
    );

    const collectorId = response.id ?? response.collectorId;

    if (!collectorId) {
      throw new Error(
        "Bright Data collector creation succeeded but no collector ID was returned.",
      );
    }

    return {
      collectorId,
      name: response.name ?? collectorName,
      url: targetUrl,
      status: this.normalizeCollectorStatus(response.status),
    };
  }

  async triggerAiFlow(
    collectorId: string,
    target: ScraperTarget,
  ): Promise<AiFlowTriggerResult> {
    const id = collectorId.trim();

    if (!id) {
      throw new Error("Collector ID is required.");
    }

    const targetUrl = target.url.trim();

    if (!targetUrl) {
      throw new Error("Scraper target URL is required.");
    }

    const description =
      target.instructions
        ?.map((instruction) => instruction.trim())
        .filter(Boolean)
        .join(". ") ||
      target.title?.trim() ||
      "Extract relevant structured information from the target page.";

    if (!description) {
      throw new Error("AI Flow description is required.");
    }

    const response = await this.request<BrightDataAiFlowResponse>(
      `/dca/collectors/${encodeURIComponent(id)}/automate_template`,
      {
        method: "POST",

        // IMPORTANT:
        // Do NOT JSON.stringify here.
        // request() handles JSON serialization.
        body: {
          description,
          urls: [targetUrl],
        },
      },
    );

    const jobId = response.id ?? response.jobId;

    if (!jobId) {
      throw new Error(
        "Bright Data AI Flow was triggered but no AI job ID was returned.",
      );
    }

    return {
      jobId,
      queued: response.queued ?? false,
    };
  }

  async getAiFlowProgress(collectorId: string): Promise<AiFlowProgress> {
    const id = collectorId.trim();

    if (!id) {
      throw new Error("AI job ID is required.");
    }

    const response = await this.request<BrightDataAiFlowProgress>(
      `/dca/collectors/${collectorId}/automate_template/progress`,
      {
        method: "GET",
      },
    );

    return {
      jobId: id,

      step: response.step,

      completedSteps: response.completed_steps ?? [],

      status: response.status ?? "unknown",

      schema: this.normalizeSchema(response.schema),

      sampleData: this.normalizeSampleData(response.sampleData),
    };
  }

  async triggerCollector(
    request: RunCollectorRequest,
    url: string,
  ): Promise<TriggerCollectorResult> {
    const collectorId = request.collectorId.trim();
    const targetUrl = url.trim();

    if (!collectorId) {
      throw new Error("Collector ID is required.");
    }

    if (!targetUrl) {
      throw new Error("Scraper target URL is required.");
    }

    const response = await this.request<BrightDataTriggerResponse>(
      `/dca/trigger?collector=${encodeURIComponent(collectorId)}`,
      {
        method: "POST",
        body: [
          {
            url: targetUrl,
          },
        ],
      },
    );

    const collectionId =
      response.collection_id ?? response.collectionId ?? response.response_id;

    if (!collectionId) {
      throw new Error(
        "Bright Data collector was triggered but no collection ID was returned.",
      );
    }

    return {
      collectorId,
      collectionId,
      status: response.status,
      raw: response,
    };
  }

  async getDataset(collectionId: string): Promise<CollectorResult> {
    const id = collectionId.trim();

    if (!id) {
      throw new Error("Collection ID is required.");
    }

    const response = await this.request<unknown>("/dca/dataset", {
      method: "GET",

      query: {
        collection_id: id,
      },
    });

    return {
      collectorId: id,

      status: "COMPLETED",

      data: this.normalizeDataset(response),

      collectedAt: new Date().toISOString(),
    };
  }

  async runCollector(
    request: RunCollectorRequest,
    url: string,
  ): Promise<CollectorResult> {
    const result = await this.triggerCollector(request, url);

    return this.getDataset(result.collectionId);
  }

  async close(): Promise<void> {
    return;
  }

  /**
   * Creates a short, identifiable Bright Data scraper name.
   *
   * Example:
   *
   * "Houston adopts first-ever short-term rental regulations"
   * ->
   * "rw-houston-str-rules"
   */
  private buildCollectorName(target: ScraperTarget): string {
    const source = target.title?.trim() || new URL(target.url).hostname;

    let name = source.toLowerCase();

    name = name
      .replace(/\bshort[- ]term rental(s)?\b/g, "str")
      .replace(/\bregulation(s)?\b/g, "rules")
      .replace(/\bregulatory\b/g, "rules")
      .replace(/\bfirst[- ]ever\b/g, "")
      .replace(/\badopts?\b/g, "")
      .replace(/\bnew\b/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!name) {
      name = "scraper";
    }

    /*
     * Keep names short enough to remain readable
     * in Scraper Studio.
     */
    name = name.slice(0, 42);

    name = name.replace(/-+$/, "");

    return `rw-${name}`;
  }

  private normalizeSchema(value: unknown): Record<string, unknown> | undefined {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private normalizeSampleData(
    value: unknown,
  ): Record<string, unknown>[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    return value.filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    );
  }

  private normalizeDataset(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      );
    }

    if (typeof value === "object" && value !== null) {
      const object = value as Record<string, unknown>;

      if (Array.isArray(object.data)) {
        return this.normalizeDataset(object.data);
      }

      if (Array.isArray(object.results)) {
        return this.normalizeDataset(object.results);
      }

      return [object];
    }

    return [];
  }

  private async request<T>(
    path: string,
    options: {
      method: "GET" | "POST";
      body?: unknown;
      query?: Record<string, string>;
    },
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    if (options.query) {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(options.query)) {
        searchParams.set(key, value);
      }

      url = `${url}?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      method: options.method,

      headers: {
        Authorization: `Bearer ${this.apiKey}`,

        "Content-Type": "application/json",

        Accept: "application/json",
      },

      body:
        options.method === "POST"
          ? JSON.stringify(options.body ?? {})
          : undefined,
    });

    const text = await response.text();

    let payload: unknown;

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = text;
    }

    if (!response.ok) {
      const details =
        typeof payload === "string" ? payload : JSON.stringify(payload);

      throw new Error(`Bright Data API ${response.status}: ${details}`);
    }

    return payload as T;
  }

  private normalizeCollectorStatus(status?: string): Collector["status"] {
    switch (status?.toLowerCase()) {
      case "running":
        return "RUNNING";

      case "completed":
      case "done":
        return "COMPLETED";

      case "failed":
      case "error":
        return "FAILED";

      case "ready":
      case "active":
        return "READY";

      default:
        return "CREATED";
    }
  }
}
