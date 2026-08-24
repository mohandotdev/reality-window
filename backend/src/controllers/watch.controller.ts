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
  findAllWatches,
  findLatestScraperEvaluation,
  findScraperByCollectorId,
  findScraperEvaluations,
  findWatchById,
  findWatchByScenarioHash,
  updateScraperState,
} from "../watches/registry.js";

import { evaluateScraper } from "../evaluation/service.js";

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

export class ScraperStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScraperStateError";
  }
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

    const watch = await createWatchRecord(plan, scenarioHash);

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

    // Reuse existing scraper if one already exists.
    if (watch.scraper && watch.scraper.status !== "FAILED") {
      res.status(200).json({
        scraper: watch.scraper,
        reused: true,
      });

      return;
    }

    /*
     * The watch created in Phase 1 contains the planning information.
     *
     * The scraper endpoint should therefore derive the initial target
     * from that plan instead of requiring the frontend to submit
     * target/schema manually.
     */

    const sources = Array.isArray(watch.sources) ? watch.sources : [];

    if (sources.length === 0) {
      res.status(400).json({
        error: "No sources available for this watch",
      });
      return;
    }

    const primarySource = sources[0];

    if (
      typeof primarySource !== "object" ||
      primarySource === null ||
      !("url" in primarySource) ||
      typeof primarySource.url !== "string"
    ) {
      res.status(400).json({
        error: "Primary source URL is missing",
      });
      return;
    }

    const title =
      "title" in primarySource && typeof primarySource.title === "string"
        ? primarySource.title
        : watch.subject;

    const evidenceRequirements = Array.isArray(watch.evidenceRequirements)
      ? watch.evidenceRequirements.filter(
          (value): value is string => typeof value === "string",
        )
      : [];

    const target: ScraperTarget = {
      url: primarySource.url,
      title,
      instructions: [watch.assumption, ...evidenceRequirements],
      evidenceRequirements,
    };

    /*
     * Schema generation is handled by Bright Data AI Flow.
     *
     * We don't need to invent a schema here.
     */
    const scraper = await createWatchScraperRecord({
      watchId,
      target,
      status: "CREATING",
    });

    try {
      // ----------------------------------------
      // 1. Create Bright Data collector
      // ----------------------------------------

      const collector = await scraperService.createCollector({
        target,
        schema: {
          name: target.title,
          description: [watch.assumption, ...evidenceRequirements].join(". "),
          fields: [
            {
              name: "data",
              type: "object",
              description:
                "Extract the structured information relevant to the requested evidence and changes.",
              required: true,
            },
          ],
        },
      });

      await updateScraperState(watchId, {
        collectorId: collector.collectorId,
        status: "AI_FLOW_RUNNING",
      });

      // ----------------------------------------
      // 2. Trigger Bright Data AI Flow
      // ----------------------------------------

      const aiFlow = await scraperService.triggerAiFlow(
        collector.collectorId,
        target,
      );

      await updateScraperState(watchId, {
        aiJobId: aiFlow.jobId,
        status: "AI_FLOW_RUNNING",
      });

      // ----------------------------------------
      // 3. Return current scraper state
      // ----------------------------------------

      const updated = await findWatchById(watchId);

      res.status(201).json({
        scraper: updated?.scraper,
        reused: false,
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
    console.log({ watchId });
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

    if (!scraper.aiJobId) {
      res.status(409).json({
        error: "AI Flow job has not been created yet",
      });
      return;
    }

    const progress = await scraperService.getAiFlowProgress(
      scraper.collectorId,
    );

    const status = progress.status.toLowerCase();

    console.log({ status });

    if (status === "done" || status === "completed") {
      await updateScraperState(watchId, {
        status: "READY",
        schema:
          progress.schema !== undefined
            ? (progress.schema as unknown as Prisma.InputJsonValue)
            : undefined,
        sampleData:
          progress.sampleData !== undefined
            ? (progress.sampleData as unknown as Prisma.InputJsonValue)
            : undefined,
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

    if (scraper.status === "RUNNING") {
      throw new ScraperStateError("Scraper is already running");
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

    if (error instanceof ScraperStateError) {
      res.status(409).json({
        error: error.message,
      });
      return;
    }

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

export async function getWatch(req: Request, res: Response): Promise<void> {
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

    const latestEvaluation = watch.scraper
      ? await findLatestScraperEvaluation(watch.scraper.id)
      : null;

    res.status(200).json({
      watch: {
        id: watch.id,
        subject: watch.subject,
        assumption: watch.assumption,
        searchQueries: watch.searchQueries,
        sources: watch.sources,
        evidenceRequirements: watch.evidenceRequirements,
        createdAt: watch.createdAt,
        updatedAt: watch.updatedAt,
      },

      scraper: watch.scraper
        ? {
            id: watch.scraper.id,
            collectorId: watch.scraper.collectorId,
            aiJobId: watch.scraper.aiJobId,
            collectionId: watch.scraper.collectionId,
            status: watch.scraper.status,
            target: watch.scraper.target,
            schema: watch.scraper.schema,
            sampleData: watch.scraper.sampleData,
            latestData: watch.scraper.latestData,
            approvedAt: watch.scraper.approvedAt,
            lastRunAt: watch.scraper.lastRunAt,
            createdAt: watch.scraper.createdAt,
            updatedAt: watch.scraper.updatedAt,
          }
        : null,

      evaluation: latestEvaluation,
    });
  } catch (error) {
    console.error("Failed to get watch:", error);

    res.status(500).json({
      error: "Failed to get watch",
    });
  }
}

export async function getWatchEvaluations(
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

    if (!watch.scraper) {
      res.status(200).json({
        evaluations: [],
      });
      return;
    }

    const evaluations = await findScraperEvaluations(watch.scraper.id);

    res.status(200).json({
      evaluations,
    });
  } catch (error) {
    console.error("Failed to get watch evaluations:", error);

    res.status(500).json({
      error: "Failed to get watch evaluations",
    });
  }
}

export async function evaluateWatchScraper(
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
    const result = await evaluateScraper(watchId);

    res.status(200).json({
      evaluation: result,
    });
  } catch (error) {
    console.error("Failed to evaluate scraper:", error);

    const message =
      error instanceof Error ? error.message : "Failed to evaluate scraper";

    if (message === "Watch not found." || message === "Scraper not found.") {
      res.status(404).json({
        error: message,
      });
      return;
    }

    if (
      message === "No latest scraper data is available for evaluation." ||
      message === "Latest scraper data does not contain evaluable records."
    ) {
      res.status(409).json({
        error: message,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to evaluate scraper",
    });
  }
}

export async function getWatches(_req: Request, res: Response): Promise<void> {
  try {
    const watches = await findAllWatches();

    res.status(200).json({
      watches: watches.map((watch) => {
        const latest = watch.scraper?.evaluations[0];

        return {
          id: watch.id,
          subject: watch.subject,
          assumption: watch.assumption,
          scraperStatus: watch.scraper?.status ?? null,
          collectionId: watch.scraper?.collectionId ?? null,
          approvedAt: watch.scraper?.approvedAt ?? null,
          lastScraperUpdateAt: watch.scraper?.updatedAt ?? null,
          latestEvaluation: latest
            ? {
                verdict: latest.verdict,
                createdAt: latest.createdAt,
                confidence: latest.confidence,
              }
            : null,
          createdAt: watch.createdAt,
          updatedAt: watch.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to get watches:", error);

    res.status(500).json({
      error: "Failed to get watches",
    });
  }
}
