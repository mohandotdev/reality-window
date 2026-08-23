import { Router } from "express";

import { createWatch } from "../controllers/watch.controller.js";

const router = Router();

router.post("/", createWatch);

export default router;
