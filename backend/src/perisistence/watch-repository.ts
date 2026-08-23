import { prisma } from "./client.js";
import type { ScraperStatus } from "../generated/prisma/enums.js";

export interface CreateWatchRecord {
  whatToWatch: string;
  assumption: string;
  scenarioHash: string;
}

export interface UpdateScraperRecord {
  scraperId?: string;
  scraperStatus?: ScraperStatus;
  lastRunAt?: Date;
  lastVerifiedAt?: Date;
}

export async function findWatchByScenarioHash(scenarioHash: string) {
  return prisma.watch.findUnique({
    where: {
      scenarioHash,
    },
  });
}

export async function createWatchRecord(data: CreateWatchRecord) {
  return prisma.watch.create({
    data: {
      subject: data.whatToWatch,
      assumption: data.assumption,
      scenarioHash: data.scenarioHash,
    },
  });
}

export async function updateWatchScraper(
  watchId: string,
  data: UpdateScraperRecord,
) {
  return prisma.watch.update({
    where: {
      id: watchId,
    },
    data,
  });
}

export async function findWatchById(watchId: string) {
  return prisma.watch.findUnique({
    where: {
      id: watchId,
    },
  });
}
