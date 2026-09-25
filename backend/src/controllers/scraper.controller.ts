import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../perisistence/client.js";
import { createScraperService } from "../scraper/service.js";
import { classifyCollectionError } from "../scraper/collection-outcome.js";
import {
  findScraperByCollectorId,
  findScraperByTargetUrl,
  findScraperByCollectionId,
} from "../watches/registry.js";
import { findNextEligibleSource } from "../watches/source-fallback.js";
import type { WatchSource } from "../watches/types.js";
import crypto from "node:crypto";

type BrightDataWebhookRecord = Record<string, unknown>;

function isRecord(value: unknown): value is BrightDataWebhookRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractCollectorId(
  payload: unknown,
  req: Request,
): string | undefined {
  if (isRecord(payload)) {
    if (typeof payload.collector_id === "string") {
      return payload.collector_id;
    }

    if (typeof payload.collectorId === "string") {
      return payload.collectorId;
    }
  }

  const queryCollectorId = req.query.collector_id ?? req.query.collectorId;

  return typeof queryCollectorId === "string" && queryCollectorId.trim()
    ? queryCollectorId.trim()
    : undefined;
}

function extractTargetUrl(payload: unknown): string | undefined {
  const records = Array.isArray(payload) ? payload : [payload];

  for (const record of records) {
    if (!isRecord(record)) {
      continue;
    }

    const input = record.input;

    if (isRecord(input) && typeof input.url === "string") {
      return input.url.trim();
    }

    if (typeof record.url === "string") {
      return record.url.trim();
    }
  }

  return undefined;
}

function normalizeWebhookData(payload: unknown): Prisma.InputJsonValue {
  if (Array.isArray(payload)) {
    return payload as Prisma.InputJsonValue;
  }

  if (isRecord(payload)) {
    return [payload] as Prisma.InputJsonValue;
  }

  throw new Error("Bright Data webhook payload must be an object or array.");
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

function extractWatchSources(value: unknown): WatchSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((source): source is WatchSource => {
    if (!isRecord(source)) {
      return false;
    }

    return (
      typeof source.title === "string" &&
      typeof source.url === "string" &&
      typeof source.snippet === "string" &&
      (source.eligibility === "ELIGIBLE" || source.eligibility === "EXCLUDED")
    );
  });
}

export async function scraperWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const webhookRequestId = crypto.randomUUID();

  const scraperService = createScraperService();

  console.log("Bright Data webhook received", {
    webhookRequestId,
  });

  console.log("Bright Data webhook payload:", req.body);

  console.log("Bright Data webhook headers:", {
    collectionId: req.headers["dca-collection-id"],
    dataset: req.headers["dca-dataset"],
    filename: req.headers["dca-filename"],
    contentType: req.headers["content-type"],
    userAgent: req.headers["user-agent"],
  });

  try {
    /*
     * Bright Data delivers the collection identifier through
     * the dca-collection-id header.
     *
     * The webhook body can be [] for failed extraction results,
     * so we must NOT use req.body as the source of truth.
     */
    const headerCollectionId = req.headers["dca-collection-id"];

    const collectionId =
      typeof headerCollectionId === "string"
        ? headerCollectionId.trim()
        : undefined;

    if (!collectionId) {
      console.error("Bright Data webhook missing collection ID", {
        webhookRequestId,
      });

      res.status(200).json({
        received: true,
        status: "IGNORED",
        reason: "missing-collection-id",
      });

      return;
    }

    /*
     * Only process dataset deliveries.
     */
    const datasetHeader = req.headers["dca-dataset"];

    const isDatasetDelivery =
      datasetHeader === "true" ||
      (Array.isArray(datasetHeader) && datasetHeader.includes("true"));

    if (!isDatasetDelivery) {
      console.log("Ignoring non-dataset Bright Data webhook", {
        webhookRequestId,
        collectionId,
        datasetHeader,
      });

      res.status(200).json({
        received: true,
        status: "IGNORED",
        reason: "not-a-dataset-delivery",
        collectionId,
      });

      return;
    }

    /*
     * Resolve the WatchScraper using Bright Data's collection ID.
     *
     * This is the strongest correlation key available to us.
     */
    const scraper = await findScraperByCollectionId(collectionId);

    if (!scraper) {
      console.warn("No WatchScraper found for Bright Data collection", {
        webhookRequestId,
        collectionId,
      });

      res.status(200).json({
        received: true,
        status: "IGNORED",
        reason: "unknown-collection",
        collectionId,
      });

      return;
    }

    console.log("Bright Data collection matched", {
      webhookRequestId,
      collectionId,
      scraperId: scraper.id,
      watchId: scraper.watchId,
      collectorId: scraper.collectorId,
      currentStatus: scraper.status,
    });

    /*
     * Retrieve the actual collection result.
     *
     * IMPORTANT:
     * req.body may be [] even though Bright Data has an
     * extraction-failure record in the dataset.
     */
    const collectionResult =
      await scraperService.getCollectionResult(collectionId);

    console.log("Bright Data collection result", {
      webhookRequestId,
      collectionId,
      outcome: collectionResult.outcome,
      status: collectionResult.status,
      dataCount: collectionResult.data.length,
      error: collectionResult.error,
    });

    /*
     * We only expect the webhook's dataset result to produce
     * these collection outcomes.
     *
     * Infrastructure-level FAILED is handled by the scraper
     * adapter itself, not inferred from this webhook.
     */
    const outcome = collectionResult.outcome;

    /*
     * Determine the source URL associated with this collection.
     *
     * Prefer the URL from the actual dataset result, because
     * that represents the source Bright Data actually processed.
     */
    const webhookTargetUrl =
      extractTargetUrl(collectionResult.data) ?? undefined;

    const currentTarget =
      scraper.target &&
      typeof scraper.target === "object" &&
      !Array.isArray(scraper.target)
        ? (scraper.target as Record<string, unknown>)
        : undefined;

    const currentTargetUrl =
      typeof currentTarget?.url === "string" ? currentTarget.url : undefined;

    /*
     * Ignore stale webhook deliveries.
     *
     * Example:
     *
     * Source A
     *   ↓ fails
     * fallback to Source B
     *
     * A's webhook arrives again later.
     *
     * If the scraper is already targeting B, we must not
     * initiate another fallback from A.
     */
    if (
      webhookTargetUrl &&
      currentTargetUrl &&
      normalizeUrl(webhookTargetUrl) !== normalizeUrl(currentTargetUrl)
    ) {
      console.log("Ignoring stale Bright Data webhook", {
        webhookRequestId,
        collectionId,
        webhookTargetUrl,
        currentTargetUrl,
      });

      res.status(200).json({
        received: true,
        status: "IGNORED",
        reason: "stale-webhook",
        collectionId,
        watchId: scraper.watchId,
      });

      return;
    }

    /*
     * Handle source collection failure.
     */
    if (outcome === "SOURCE_UNAVAILABLE" || outcome === "SOURCE_BLOCKED") {
      console.warn("Bright Data source collection failed", {
        webhookRequestId,
        collectionId,
        outcome,
        error: collectionResult.error,
      });

      /*
       * Read the watch's planned sources.
       */
      const watchSources = Array.isArray(scraper.watch.sources)
        ? (scraper.watch.sources as unknown as WatchSource[])
        : [];

      if (!currentTargetUrl) {
        console.error(
          "Cannot perform source fallback without current target URL",
          {
            webhookRequestId,
            watchId: scraper.watchId,
            collectionId,
          },
        );

        await prisma.watchScraper.updateMany({
          where: {
            watchId: scraper.watchId,
            status: "RUNNING",
          },
          data: {
            status: "UNAVAILABLE",
            lastRunAt: new Date(),
          },
        });

        res.status(200).json({
          received: true,
          status: "UNAVAILABLE",
          reason: "missing-current-target",
          watchId: scraper.watchId,
        });

        return;
      }

      /*
       * Find the next eligible source after the current source.
       */
      const nextSource = findNextEligibleSource(watchSources, currentTargetUrl);

      if (!nextSource) {
        console.warn("No eligible fallback source remains", {
          webhookRequestId,
          watchId: scraper.watchId,
          currentTargetUrl,
        });

        /*
         * Atomic state transition:
         *
         * Only the currently RUNNING scraper for the current
         * target can transition to UNAVAILABLE.
         *
         * This prevents duplicate webhooks from racing.
         */
        const updated = await prisma.watchScraper.updateMany({
          where: {
            id: scraper.id,
            collectionId,
            status: "RUNNING",
            target: {
              path: ["url"],
              equals: currentTargetUrl,
            },
          },
          data: {
            status: "UNAVAILABLE",
            lastRunAt: new Date(),
          },
        });

        if (updated.count === 0) {
          console.log(
            "Fallback termination already handled by another webhook",
            {
              webhookRequestId,
              watchId: scraper.watchId,
              currentTargetUrl,
            },
          );

          res.status(200).json({
            received: true,
            status: "IGNORED",
            reason: "already-handled",
            watchId: scraper.watchId,
          });

          return;
        }

        res.status(200).json({
          received: true,
          status: "UNAVAILABLE",
          reason: "no-eligible-fallback-source",
          watchId: scraper.watchId,
        });

        return;
      }

      console.log("Selecting fallback source", {
        webhookRequestId,
        watchId: scraper.watchId,
        currentSource: currentTargetUrl,
        nextSource: nextSource.url,
      });

      /*
       * Preserve the existing target metadata while switching
       * the actual source.
       */
      const nextTarget = {
        ...(currentTarget ?? {}),
        url: nextSource.url,
        title: nextSource.title,
      };

      /*
       * Atomically switch the scraper target.
       *
       * This is the race protection:
       *
       * Two identical failure webhooks can arrive at almost
       * exactly the same time, but only one is allowed to
       * change A → B.
       */
      const switched = await prisma.watchScraper.updateMany({
        where: {
          id: scraper.id,
          collectionId,
          status: "RUNNING",
          target: {
            path: ["url"],
            equals: currentTargetUrl,
          },
        },
        data: {
          target: nextTarget as Prisma.InputJsonValue,
          status: "RUNNING",
          lastRunAt: new Date(),
        },
      });

      if (switched.count === 0) {
        console.log("Fallback already handled by another webhook", {
          webhookRequestId,
          watchId: scraper.watchId,
          currentTargetUrl,
          nextSource: nextSource.url,
        });

        res.status(200).json({
          received: true,
          status: "IGNORED",
          reason: "fallback-already-handled",
          watchId: scraper.watchId,
        });

        return;
      }

      /*
       * A collector ID is required to trigger the fallback
       * collection.
       */
      if (!scraper.collectorId) {
        console.error("Cannot perform fallback without a collector ID", {
          webhookRequestId,
          watchId: scraper.watchId,
        });

        await prisma.watchScraper.updateMany({
          where: {
            id: scraper.id,
            collectionId,
            status: "RUNNING",
            target: {
              path: ["url"],
              equals: nextSource.url,
            },
          },
          data: {
            status: "FAILED",
            lastRunAt: new Date(),
          },
        });

        res.status(200).json({
          received: true,
          status: "FAILED",
          reason: "missing-collector-id",
          watchId: scraper.watchId,
        });

        return;
      }

      /*
       * Trigger the SAME Bright Data collector against the
       * next eligible source.
       */
      try {
        const result = await scraperService.triggerCollector(
          scraper.collectorId,
          nextSource.url,
        );

        console.log("Fallback collection triggered", {
          webhookRequestId,
          watchId: scraper.watchId,
          collectorId: scraper.collectorId,
          previousSource: currentTargetUrl,
          nextSource: nextSource.url,
          collectionId: result.collectionId,
        });

        /*
         * Store the new collection ID so its webhook can be
         * correlated back to this WatchScraper.
         */
        await prisma.watchScraper.updateMany({
          where: {
            id: scraper.id,
            collectionId,
            status: "RUNNING",
            target: {
              path: ["url"],
              equals: nextSource.url,
            },
          },
          data: {
            collectionId: result.collectionId,
            status: "RUNNING",
            lastRunAt: new Date(),
          },
        });

        res.status(200).json({
          received: true,
          status: "RUNNING",
          reason: "fallback-triggered",
          watchId: scraper.watchId,
          collectionId: result.collectionId,
          source: nextSource.url,
        });

        return;
      } catch (error) {
        console.error("Failed to trigger fallback collection", {
          webhookRequestId,
          watchId: scraper.watchId,
          collectorId: scraper.collectorId,
          nextSource: nextSource.url,
          error,
        });

        await prisma.watchScraper.updateMany({
          where: {
            id: scraper.id,
            collectionId,
            status: "RUNNING",
            target: {
              path: ["url"],
              equals: nextSource.url,
            },
          },
          data: {
            status: "FAILED",
            lastRunAt: new Date(),
          },
        });

        res.status(200).json({
          received: true,
          status: "FAILED",
          reason: "fallback-trigger-failed",
          watchId: scraper.watchId,
        });

        return;
      }
    }

    /*
     * Successful collection.
     */
    if (outcome === "SUCCESS") {
      /*
       * Atomic completion prevents an old/duplicate webhook
       * from completing a scraper that has already moved to
       * another fallback source.
       */
      const completed = await prisma.watchScraper.updateMany({
        where: {
          id: scraper.id,
          collectionId,
          status: "RUNNING",
          ...(currentTargetUrl
            ? {
                target: {
                  path: ["url"],
                  equals: currentTargetUrl,
                },
              }
            : {}),
        },
        data: {
          status: "COMPLETED",
          lastRunAt: new Date(),
          latestData: collectionResult.data as Prisma.InputJsonValue,
        },
      });

      if (completed.count === 0) {
        console.log(
          "Successful webhook ignored because scraper state changed",
          {
            webhookRequestId,
            collectionId,
            watchId: scraper.watchId,
          },
        );

        res.status(200).json({
          received: true,
          status: "IGNORED",
          reason: "scraper-state-changed",
          watchId: scraper.watchId,
        });

        return;
      }

      console.log("Bright Data collection completed", {
        webhookRequestId,
        collectionId,
        watchId: scraper.watchId,
        dataCount: collectionResult.data.length,
      });

      res.status(200).json({
        received: true,
        status: "COMPLETED",
        watchId: scraper.watchId,
        collectionId,
      });

      return;
    }

    /*
     * Defensive fallback.
     *
     * We should not normally reach this branch because the
     * CollectorResult outcome is a defined union.
     */
    console.error("Unhandled Bright Data collection outcome", {
      webhookRequestId,
      collectionId,
      outcome,
    });

    res.status(200).json({
      received: true,
      status: "FAILED",
      reason: "unhandled-collection-outcome",
      watchId: scraper.watchId,
    });
  } catch (error) {
    console.error("Bright Data webhook processing failed", {
      webhookRequestId,
      error,
    });

    /*
     * Return 200 so Bright Data does not repeatedly retry a
     * webhook that our application has already received but
     * failed to process internally.
     *
     * Our internal status/error handling can be improved
     * separately in the reliability milestone.
     */
    res.status(200).json({
      received: true,
      status: "FAILED",
      reason: "webhook-processing-error",
    });
  }
}
