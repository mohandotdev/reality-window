import { prisma } from "./client.js";
import type { ScraperStatus, ScraperTarget } from "../scraper/types.js";

export async function findScraperByWatchId(watchId: string) {
  return prisma.watchScraper.findUnique({
    where: {
      watchId,
    },
  });
}

export async function createScraperRecord(params: {
  watchId: string;
  target: ScraperTarget;
  collectorId?: string;
  aiJobId?: string;
  status?: ScraperStatus;
}) {
  return prisma.watchScraper.create({
    data: {
      watchId: params.watchId,

      target: params.target as unknown as object,

      ...(params.collectorId ? { collectorId: params.collectorId } : {}),

      ...(params.aiJobId ? { aiJobId: params.aiJobId } : {}),

      status: params.status ?? "PENDING",
    },
  });
}

export async function updateScraperRecord(
  watchId: string,
  data: {
    collectorId?: string;
    aiJobId?: string;
    status?: ScraperStatus;
    target?: ScraperTarget;
    schema?: unknown;
    sampleData?: unknown;
    latestData?: unknown;
    approvedAt?: Date;
    lastRunAt?: Date;
  },
) {
  return prisma.watchScraper.update({
    where: {
      watchId,
    },
    data: {
      ...(data.collectorId !== undefined
        ? { collectorId: data.collectorId }
        : {}),

      ...(data.aiJobId !== undefined ? { aiJobId: data.aiJobId } : {}),

      ...(data.status !== undefined ? { status: data.status } : {}),

      ...(data.target !== undefined
        ? {
            target: data.target as unknown as object,
          }
        : {}),

      ...(data.schema !== undefined ? { schema: data.schema as object } : {}),

      ...(data.sampleData !== undefined
        ? { sampleData: data.sampleData as object }
        : {}),

      ...(data.latestData !== undefined
        ? { latestData: data.latestData as object }
        : {}),

      ...(data.approvedAt !== undefined ? { approvedAt: data.approvedAt } : {}),

      ...(data.lastRunAt !== undefined ? { lastRunAt: data.lastRunAt } : {}),
    },
  });
}
