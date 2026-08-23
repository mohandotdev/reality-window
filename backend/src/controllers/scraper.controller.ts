import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import {
  findScraperByCollectorId,
  findScraperByTargetUrl,
  updateScraperState,
} from "../watches/registry.js";

type BrightDataWebhookRecord = Record<string, unknown>;

function isRecord(value: unknown): value is BrightDataWebhookRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractCollectorId(
  payload: unknown,
  req: Request,
): string | undefined {
  if (isRecord(payload)) {
    if (typeof payload.collector_id === "string") return payload.collector_id;
    if (typeof payload.collectorId === "string") return payload.collectorId;
  }

  const queryCollectorId = req.query.collector_id ?? req.query.collectorId;
  return typeof queryCollectorId === "string" && queryCollectorId.trim()
    ? queryCollectorId.trim()
    : undefined;
}

function extractTargetUrl(payload: unknown): string | undefined {
  const records = Array.isArray(payload) ? payload : [payload];

  for (const record of records) {
    if (!isRecord(record)) continue;
    const input = record.input;
    if (isRecord(input) && typeof input.url === "string")
      return input.url.trim();
    if (typeof record.url === "string") return record.url.trim();
  }

  return undefined;
}

function normalizeWebhookData(payload: unknown): Prisma.InputJsonValue {
  if (Array.isArray(payload)) return payload as Prisma.InputJsonValue;
  if (isRecord(payload)) return [payload] as Prisma.InputJsonValue;
  throw new Error("Bright Data webhook payload must be an object or array.");
}

export async function scraperWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const payload = req.body as unknown;

    console.log(
      "Bright Data webhook received:",
      JSON.stringify(payload, null, 2),
    );

    // Prefer collectorId when supplied. The current Bright Data result
    // payload does not contain it, so fall back to the echoed input URL.
    const collectorId = extractCollectorId(payload, req);
    let scraper = collectorId
      ? await findScraperByCollectorId(collectorId)
      : null;

    if (!scraper) {
      const targetUrl = extractTargetUrl(payload);
      if (targetUrl) scraper = await findScraperByTargetUrl(targetUrl);
    }

    if (!scraper) {
      res.status(404).json({
        error: "No scraper registered for this Bright Data result",
      });
      return;
    }

    // The /scraper/run endpoint already persisted collectionId. The webhook
    // is the completion signal, so persist the actual records and complete it.
    const updated = await updateScraperState(scraper.watchId, {
      status: "COMPLETED",
      latestData: normalizeWebhookData(payload),
      lastRunAt: new Date(),
    });

    console.log("Watch scraper completed:", {
      watchId: updated.watchId,
      collectorId: updated.collectorId,
      collectionId: updated.collectionId,
      status: updated.status,
      recordCount: Array.isArray(payload) ? payload.length : 1,
    });

    res.status(200).json({
      received: true,
      status: "COMPLETED",
      watchId: updated.watchId,
      collectorId: updated.collectorId,
      collectionId: updated.collectionId,
    });
  } catch (error) {
    console.error("Failed to process Bright Data webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
}
