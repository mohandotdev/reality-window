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
  constructor(private readonly studio: ScraperStudio = new ScraperStudio()) {}

  async createCollector(request: CreateCollectorRequest): Promise<Collector> {
    this.validateTarget(request.target);

    return this.studio.createCollector(request);
  }

  async triggerAiFlow(
    collectorId: string,
    target: ScraperTarget,
  ): Promise<AiFlowTriggerResult> {
    this.validateTarget(target);

    return this.studio.triggerAiFlow(collectorId, target);
  }

  async getAiFlowProgress(collectorId: string): Promise<AiFlowProgress> {
    if (!collectorId.trim()) {
      throw new Error("AI job ID is required.");
    }

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
      throw new Error("Scraper target URL is required.");
    }

    const result = await this.studio.triggerCollector(
      {
        collectorId,
      },
      targetUrl,
    );

    if (!result.collectionId) {
      throw new Error("Bright Data did not return a collection ID.");
    }

    return {
      collectionId: result.collectionId,
    };
  }

  async getDataset(collectionId: string): Promise<CollectorResult> {
    if (!collectionId.trim()) {
      throw new Error("Collection ID is required.");
    }

    return this.studio.getDataset(collectionId);
  }

  private validateTarget(target: ScraperTarget): void {
    if (!target.url.trim()) {
      throw new Error("Scraper target URL is required.");
    }

    if (!target.title.trim()) {
      throw new Error("Scraper target title is required.");
    }

    if (target.instructions.length === 0) {
      throw new Error("At least one scraper instruction is required.");
    }

    if (target.evidenceRequirements.length === 0) {
      throw new Error("At least one evidence requirement is required.");
    }
  }

  private validateSchema(schema: ScraperSchema): void {
    if (!schema.name.trim()) {
      throw new Error("Scraper schema name is required.");
    }

    if (schema.fields.length === 0) {
      throw new Error("Scraper schema must contain at least one field.");
    }

    for (const field of schema.fields) {
      if (!field.name.trim()) {
        throw new Error("Every scraper field must have a name.");
      }

      if (!field.description.trim()) {
        throw new Error(
          `Scraper field "${field.name}" must have a description.`,
        );
      }
    }
  }
}

export function createScraperService(): ScraperService {
  return new ScraperService();
}
