import crypto from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../perisistence/client.js";
import type { WatchPlan } from "./types.js";

export function createScenarioHash(
  subject: string,
  assumption: string,
): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        subject: subject.trim().toLowerCase(),
        assumption: assumption.trim().toLowerCase(),
      }),
    )
    .digest("hex");
}

export async function findWatch(subject: string, assumption: string) {
  return findWatchByScenarioHash(createScenarioHash(subject, assumption));
}

export async function findWatchByScenarioHash(scenarioHash: string) {
  return prisma.watch.findUnique({
    where: {
      scenarioHash,
    },
    include: {
      scraper: true,
    },
  });
}

export async function findWatchById(watchId: string) {
  return prisma.watch.findUnique({
    where: {
      id: watchId,
    },
    include: {
      scraper: true,
    },
  });
}

export async function createWatchRecord(
  plan: WatchPlan,
  scenarioHash: string,
) {
  return prisma.watch.create({
    data: {
      subject: plan.subject,
      assumption: plan.assumption,
      scenarioHash,

      searchQueries: plan.searchQueries as unknown as Prisma.InputJsonValue,

      sources: plan.sources as unknown as Prisma.InputJsonValue,

      evidenceRequirements:
        plan.evidenceRequirements as unknown as Prisma.InputJsonValue,
    },
    include: {
      scraper: true,
    },
  });
}

export async function createWatchScraperRecord(data: {
  watchId: string;
  target: object;
  status?: Parameters<
    typeof prisma.watchScraper.create
  >[0]["data"]["status"];
}) {
  return prisma.watchScraper.create({
    data: {
      watchId: data.watchId,
      target: data.target,
      status: data.status ?? "PENDING",
    },
  });
}

export async function findScraperByCollectorId(collectorId: string) {
  return prisma.watchScraper.findUnique({
    where: {
      collectorId,
    },
  });
}

/**
 * Bright Data's webhook result currently echoes the input URL but does not
 * include collector_id in the scraped records. Use the target URL as a
 * fallback correlation key when collector_id is unavailable.
 */
export async function findScraperByTargetUrl(targetUrl: string) {
  const scrapers = await prisma.watchScraper.findMany({
    where: {
      target: {
        path: ["url"],
        equals: targetUrl,
      },
    },
  });

  return scrapers[0] ?? null;
}

type WatchScraperUpdateData = Parameters<
  typeof prisma.watchScraper.update
>[0]["data"];

export async function updateScraperState(
  watchId: string,
  data: WatchScraperUpdateData,
) {
  return prisma.watchScraper.update({
    where: {
      watchId,
    },
    data,
  });
}

export async function findLatestScraperEvaluation(scraperId: string) {
  return prisma.scraperEvaluation.findFirst({
    where: {
      scraperId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findScraperEvaluations(scraperId: string) {
  return prisma.scraperEvaluation.findMany({
    where: {
      scraperId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}