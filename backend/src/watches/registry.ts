import crypto from "node:crypto";

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

/**
 * The planning result is returned to the client but is not
 * persisted on Watch because the Prisma model does not have
 * a plan column.
 */
export async function createWatchRecord(data: {
  subject: string;
  assumption: string;
  scenarioHash: string;
}) {
  return prisma.watch.create({
    data: {
      subject: data.subject,
      assumption: data.assumption,
      scenarioHash: data.scenarioHash,
    },
    include: {
      scraper: true,
    },
  });
}

export async function createWatchScraperRecord(data: {
  watchId: string;
  target: object;
  status?: Parameters<typeof prisma.watchScraper.create>[0]["data"]["status"];
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
