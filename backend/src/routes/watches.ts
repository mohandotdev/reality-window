import { Router } from "express";

import {
  approveWatchScraper,
  createWatch,
  createWatchScraper,
  evaluateWatchScraper,
  getWatch,
  getWatchEvaluations,
  getWatchScraper,
  getWatchScraperDataset,
  getWatchScraperProgress,
  runWatchScraper,
} from "../controllers/watch.controller.js";

const router = Router();

/**
 * Watch planning.
 */
router.post("/", createWatch);

/**
 * Watch state / evaluation.
 */
router.get("/:watchId", getWatch);

router.post("/:watchId/evaluate", evaluateWatchScraper);

router.get("/:watchId/evaluations", getWatchEvaluations);

/**
 * Scraper lifecycle.
 */
router.post("/:watchId/scraper", createWatchScraper);

router.get("/:watchId/scraper", getWatchScraper);

router.get("/:watchId/scraper/progress", getWatchScraperProgress);

router.post("/:watchId/scraper/approve", approveWatchScraper);

router.post("/:watchId/scraper/run", runWatchScraper);

router.get("/:watchId/scraper/dataset/:collectionId", getWatchScraperDataset);

export default router;
