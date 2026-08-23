import type { Request, Response } from "express";

import {
  findScraperByCollectorId,
  updateScraperState,
} from "../watches/registry.js";

export async function scraperWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const payload =
      req.body as Record<string, unknown>;

    console.log(
      "Bright Data webhook received:",
      JSON.stringify(payload, null, 2),
    );

    const collectorId =
      typeof payload.collector_id === "string"
        ? payload.collector_id
        : typeof payload.collectorId === "string"
          ? payload.collectorId
          : undefined;

    if (!collectorId) {
      res.status(400).json({
        error:
          "collector_id missing from webhook payload",
      });
      return;
    }

    const scraper =
      await findScraperByCollectorId(
        collectorId,
      );

    if (!scraper) {
      res.status(404).json({
        error:
          "No scraper registered for collector",
      });
      return;
    }

    /**
     * Bright Data webhook is the completion signal.
     */
    await updateScraperState(
      scraper.watchId,
      {
        status: "COMPLETED",
        latestData: payload,
        lastRunAt: new Date(),
      },
    );

    res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Failed to process Bright Data webhook:",
      error,
    );

    res.status(500).json({
      error: "Failed to process webhook",
    });
  }
}