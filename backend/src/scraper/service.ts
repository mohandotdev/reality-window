import { ScraperStudio } from "./studio.js";

import type {
  AiFlowProgress,
  AiFlowTriggerResult,
  Collector,
  CollectorResult,
  CreateCollectorRequest,
  ScraperSchema,
  ScraperTarget,
} from "./types.js";

export class ScraperService {
  constructor(
    private readonly studio: ScraperStudio = new ScraperStudio(),
  ) {}

  async createCollector(
    request: CreateCollectorRequest,
  ): Promise<Collector> {
    this.validateTarget(request.target);
    this.validateSchema(request.schema);

    return this.studio.createCollector(request);
  }

  async triggerAiFlow(
    collectorId: string,
    target: ScraperTarget,
  ): Promise<AiFlowTriggerResult> {
    this.validateTarget(target);

    return this.studio.triggerAiFlow(
      collectorId,
      target,
    );
  }

  async getAiFlowProgress(
    collectorId: string,
  ): Promise<AiFlowProgress> {
    return this.studio.getAiFlowProgress(collectorId);
  }

  async triggerCollector(
    collectorId: string,
    targetUrl: string,
  ): Promise<{ collectionId: string }> {
    if (!collectorId.trim()) {
      throw new Error("Collector ID is required.");
    }

    if (!targetUrl.trim()) {
      throw new Error(
        "Scraper target URL is required.",
      );
    }

    return this.studio.triggerCollector(
      { collectorId },
      targetUrl,
    );
  }

  async getDataset(
    collectionId: string,
  ): Promise<CollectorResult> {
    return this.studio.getDataset(collectionId);
  }

  private validateTarget(
    target: ScraperTarget,
  ): void {
    if (!target.url.trim()) {
      throw new Error(
        "Scraper target URL is required.",
      );
    }

    if (!target.title.trim()) {
      throw new Error(
        "Scraper target title is required.",
      );
    }

    if (target.instructions.length === 0) {
      throw new Error(
        "At least one scraper instruction is required.",
      );
    }

    if (target.evidenceRequirements.length === 0) {
      throw new Error(
        "At least one evidence requirement is required.",
      );
    }
  }

  private validateSchema(
    schema: ScraperSchema,
  ): void {
    if (!schema.name.trim()) {
      throw new Error(
        "Scraper schema name is required.",
      );
    }

    if (schema.fields.length === 0) {
      throw new Error(
        "Scraper schema must contain at least one field.",
      );
    }

    for (const field of schema.fields) {
      if (!field.name.trim()) {
        throw new Error(
          "Every scraper field must have a name.",
        );
      }

      if (!field.description.trim()) {
        throw new Error(
          `Scraper field "${field.name}" must have a description.`,
        );
      }
    }
  }

  async close(): Promise<void> {
    await this.studio.close?.();
  }
}

export function createScraperService(): ScraperService {
  return new ScraperService();
}