import { Router } from "express";
import { scraperWebhook } from "../controllers/scraper.controller.js";

const router = Router();

router.post("/webhook", scraperWebhook);

export default router;