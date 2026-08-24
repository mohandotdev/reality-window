import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../perisistence/client.js";
import { createLlmService } from "../llm/service.js";

import type {
  ChangedField,
  EvaluationEvidence,
  RealityEvaluation,
} from "./types.js";

const llmService = createLlmService();

function normalizeLatestData(
  value: Prisma.JsonValue,
): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is Prisma.JsonObject =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
      .map((item) => Object.fromEntries(Object.entries(item)));
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return [Object.fromEntries(Object.entries(value))];
  }

  return [];
}

export interface PersistedRealityEvaluation extends RealityEvaluation {
  id: string;
  scraperId: string;
  collectionId: string | null;
  createdAt: Date;
}

export async function evaluateScraper(
  watchId: string,
): Promise<PersistedRealityEvaluation> {
  const watch = await prisma.watch.findUnique({
    where: {
      id: watchId,
    },
    include: {
      scraper: true,
    },
  });

  if (!watch) {
    throw new Error("Watch not found.");
  }

  if (!watch.scraper) {
    throw new Error("Scraper not found.");
  }

  if (watch.scraper.latestData === null) {
    throw new Error("No latest scraper data is available for evaluation.");
  }

  const previousEvaluation = await prisma.scraperEvaluation.findFirst({
    where: {
      scraperId: watch.scraper.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const evidenceRequirements = Array.isArray(watch.evidenceRequirements)
    ? watch.evidenceRequirements.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  const latestData = normalizeLatestData(watch.scraper.latestData);

  if (latestData.length === 0) {
    throw new Error("Latest scraper data does not contain evaluable records.");
  }

  const result = await llmService.evaluate({
    subject: watch.subject,
    assumption: watch.assumption,
    evidenceRequirements,
    latestData,

    previousEvaluation: previousEvaluation
      ? {
          verdict: previousEvaluation.verdict,
          confidence: previousEvaluation.confidence,
          reasoning: previousEvaluation.reasoning,
          evidence: previousEvaluation.evidence,
          changedFields: previousEvaluation.changedFields,
        }
      : undefined,
  });

  const evaluation = await prisma.scraperEvaluation.create({
    data: {
      scraperId: watch.scraper.id,
      collectionId: watch.scraper.collectionId,

      verdict: result.verdict,
      confidence: result.confidence,
      reasoning: result.reasoning,

      evidence: result.evidence as unknown as Prisma.InputJsonValue,

      changedFields: result.changedFields as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    id: evaluation.id,
    scraperId: evaluation.scraperId,
    collectionId: evaluation.collectionId,
    createdAt: evaluation.createdAt,

    verdict: evaluation.verdict,
    confidence: evaluation.confidence,
    reasoning: evaluation.reasoning,

    evidence: result.evidence as EvaluationEvidence[],
    changedFields: result.changedFields as ChangedField[],
  };
}
