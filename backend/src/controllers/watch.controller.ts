import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";

import { createScraperService } from "../scraper/service.js";

import type {
  ScraperApprovalRequest,
  ScraperTarget,
} from "../scraper/types.js";

import { createWatchPlan } from "../watches/planner.js";

import type { CreateWatchRequest } from "../watches/types.js";

import { createScenarioHash } from "../perisistence/scenario-hash.js";

import {
  createWatchRecord,
  createWatchScraperRecord,
  findScraperByCollectorId,
  findWatchById,
  findWatchByScenarioHash,
  updateScraperState,
} from "../watches/registry.js";

const scraperService = createScraperService();

function getRouteParam(
  value: string | string[] | undefined,
  name: string,
): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  throw new Error(`${name} is required`);
}

export async function createWatch(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<CreateWatchRequest>;

  if (typeof body.subject !== "string" || !body.subject.trim()) {
    res.status(400).json({
      error: "subject is required",
    });
    return;
  }

  if (typeof body.assumption !== "string" || !body.assumption.trim()) {
    res.status(400).json({
      error: "assumption is required",
    });
    return;
  }

  const subject = body.subject.trim();
  const assumption = body.assumption.trim();

  try {
    const scenarioHash = createScenarioHash(subject, assumption);

    /**
     * Important:
     * Do not run SERP + LLM again for an existing scenario.
     */
    const existingWatch = await findWatchByScenarioHash(scenarioHash);

    if (existingWatch) {
      res.status(200).json({
        watchId: existingWatch.id,
        scraper: existingWatch.scraper,
        reused: true,
      });

      return;
    }

    /**
     * First-time scenario:
     * run the existing planning pipeline.
     */
    const plan = await createWatchPlan({
      subject,
      assumption,
    });

    const watch = await createWatchRecord({
      subject,
      assumption,
      scenarioHash,
    });

    res.status(201).json({
      watchId: watch.id,
      plan,
      scraper: null,
      reused: false,
    });
  } catch (error) {
    console.error("Failed to create watch:", error);

    res.status(500).json({
      error: "Failed to create watch",
    });
  }
}

interface CreateWatchScraperBody {
  target: ScraperTarget;
  schema: {
    name: string;
    description?: string;
    fields: Array<{
      name: string;
      type: "string" | "number" | "boolean" | "date" | "array" | "object";
      description: string;
      required: boolean;
    }>;
  };
}

export async function createWatchScraper(
  req: Request,
  res: Response,
): Promise<void> {
  let watchId: string;

  try {
    watchId = getRouteParam(req.params.watchId, "watchId");
  } catch {
    res.status(400).json({
      error: "watchId is required",
    });
    return;
  }

  try {
    const watch = await findWatchById(watchId);

    if (!watch) {
      res.status(404).json({
        error: "Watch not found",
      });
      return;
    }

    if (watch.scraper) {
      res.status(200).json({
        scraper: watch.scraper,
        reused: true,
      });

      return;
    }

    const body = req.body as Partial<CreateWatchScraperBody>;

    if (!body.target) {
      res.status(400).json({
        error: "target is required",
      });
      return;
    }

    if (!body.schema) {
      res.status(400).json({
        error: "schema is required",
      });
      return;
    }

    const target = body.target;

    const scraperSchema = body.schema;

    const scraper = await createWatchScraperRecord({
      watchId,
      target,
      status: "CREATING",
    });

    try {
      const collector = await scraperService.createCollector({
        target,
        schema: scraperSchema,
      });

      await updateScraperState(watchId, {
        collectorId: collector.collectorId,
        status: "AI_FLOW_RUNNING",
      });

      const aiFlow = await scraperService.triggerAiFlow(
        collector.collectorId,
        target,
      );

      await updateScraperState(watchId, {
        aiJobId: aiFlow.jobId,
        status: "AI_FLOW_RUNNING",
      });

      const updated = await findWatchById(watchId);

      res.status(201).json({
        scraper: updated?.scraper,
      });
    } catch (error) {
      await updateScraperState(watchId, {
        status: "FAILED",
      });

      throw error;
    }
  } catch (error) {
    console.error("Failed to create scraper:", error);

    res.status(500).json({
      error: "Failed to create scraper",
    });
  }
}

export async function getWatchScraper(
  req: Request,
  res: Response,
): Promise<void> {
  let watchId: string;

  try {
    watchId = getRouteParam(req.params.watchId, "watchId");
  } catch {
    res.status(400).json({
      error: "watchId is required",
    });
    return;
  }

  try {
    const watch = await findWatchById(watchId);

    if (!watch) {
      res.status(404).json({
        error: "Watch not found",
      });
      return;
    }

    res.status(200).json({
      scraper: watch.scraper,
    });
  } catch (error) {
    console.error("Failed to get scraper:", error);

    res.status(500).json({
      error: "Failed to get scraper",
    });
  }
}

export async function getWatchScraperProgress(
  req: Request,
  res: Response,
): Promise<void> {
  let watchId: string;

  try {
    watchId = getRouteParam(req.params.watchId, "watchId");
  } catch {
    res.status(400).json({
      error: "watchId is required",
    });
    return;
  }

  try {
    const watch = await findWatchById(watchId);

    if (!watch?.scraper) {
      res.status(404).json({
        error: "Scraper not found",
      });
      return;
    }

    const scraper = watch.scraper;

    if (!scraper.collectorId) {
      res.status(409).json({
        error: "Collector has not been created yet",
      });
      return;
    }

    const progress = await scraperService.getAiFlowProgress(
      scraper.collectorId,
    );

    const status = progress.status.toLowerCase();

    if (status === "done" || status === "completed") {
      await updateScraperState(watchId, {
        status: "REVIEW_REQUIRED",
        schema:
          typeof progress.schema === "object" &&
          progress.schema !== null &&
          !Array.isArray(progress.schema)
            ? progress.schema
            : undefined,
        sampleData: progress.sampleData ?? undefined,
      });
    }

    if (status === "failed") {
      await updateScraperState(watchId, {
        status: "FAILED",
      });
    }

    const updated = await findWatchById(watchId);

    res.status(200).json({
      progress,
      scraper: updated?.scraper,
    });
  } catch (error) {
    console.error("Failed to get scraper progress:", error);

    res.status(500).json({
      error: "Failed to get scraper progress",
    });
  }
}

export async function approveWatchScraper(
  req: Request,
  res: Response,
): Promise<void> {
  let watchId: string;

  try {
    watchId = getRouteParam(req.params.watchId, "watchId");
  } catch {
    res.status(400).json({
      error: "watchId is required",
    });
    return;
  }

  try {
    const watch = await findWatchById(watchId);

    if (!watch?.scraper) {
      res.status(404).json({
        error: "Scraper not found",
      });
      return;
    }

    const scraper = watch.scraper;

    if (!scraper.collectorId) {
      res.status(409).json({
        error: "Collector has not been created",
      });
      return;
    }

    if (scraper.status !== "REVIEW_REQUIRED") {
      res.status(409).json({
        error: `Scraper cannot be approved from status ${scraper.status}`,
      });
      return;
    }

    const body = req.body as Partial<ScraperApprovalRequest>;

    if (!body.schema) {
      res.status(400).json({
        error: "schema is required",
      });
      return;
    }

    await updateScraperState(watchId, {
      schema: body.schema as unknown as Prisma.InputJsonValue,
      status: "APPROVED",
      approvedAt: new Date(),
    });

    res.status(200).json({
      approved: true,
      status: "APPROVED",
    });
  } catch (error) {
    console.error("Failed to approve scraper:", error);

    res.status(500).json({
      error: "Failed to approve scraper",
    });
  }
}

export async function runWatchScraper(
  req: Request,
  res: Response,
): Promise<void> {
  let watchId: string;

  try {
    watchId = getRouteParam(req.params.watchId, "watchId");
  } catch {
    res.status(400).json({
      error: "watchId is required",
    });
    return;
  }

  try {
    const watch = await findWatchById(watchId);

    if (!watch?.scraper) {
      res.status(404).json({
        error: "Scraper not found",
      });
      return;
    }

    const scraper = watch.scraper;

    if (!scraper.collectorId) {
      res.status(409).json({
        error: "Collector has not been created",
      });
      return;
    }

    if (scraper.status !== "APPROVED" && scraper.status !== "COMPLETED") {
      res.status(409).json({
        error: `Scraper cannot run from status ${scraper.status}`,
      });
      return;
    }

    const target = scraper.target as ScraperTarget | null;

    if (!target?.url) {
      res.status(409).json({
        error: "Scraper target URL is missing",
      });
      return;
    }

    await updateScraperState(watchId, {
      status: "RUNNING",
      lastRunAt: new Date(),
    });

    const result = await scraperService.triggerCollector(
      scraper.collectorId,
      target.url,
    );

    await updateScraperState(watchId, {
      collectionId: result.collectionId,
    });

    res.status(202).json({
      status: "RUNNING",
      collectionId: result.collectionId,
    });
  } catch (error) {
    console.error("Failed to run scraper:", error);

    await updateScraperState(watchId, {
      status: "FAILED",
    }).catch(() => undefined);

    res.status(500).json({
      error: "Failed to run scraper",
    });
  }
}

export async function getWatchScraperDataset(
  req: Request,
  res: Response,
): Promise<void> {
  let collectionId: string;

  try {
    collectionId = getRouteParam(req.params.collectionId, "collectionId");
  } catch {
    res.status(400).json({
      error: "collectionId is required",
    });
    return;
  }

  try {
    const result = await scraperService.getDataset(collectionId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get scraper dataset:", error);

    res.status(500).json({
      error: "Failed to get scraper dataset",
    });
  }
}
