import type { Request, Response } from "express";

import { createWatchPlan } from "../watches/planner.js";
import type { CreateWatchRequest } from "../watches/types.js";

export async function createWatch(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<CreateWatchRequest>;

  if (typeof body.subject !== "string" || !body.subject.trim()) {
    res.status(400).json({
      error: "subject is required",
    });
    return;
  }

  if (typeof body.assumption !== "string" || !body.assumption.trim()) {
    res.status(400).json({
      error: "assumption is required",
    });
    return;
  }

  try {
    const plan = await createWatchPlan({
      subject: body.subject.trim(),
      assumption: body.assumption.trim(),
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error("Failed to create watch:", error);

    res.status(500).json({
      error: "Failed to create watch plan",
    });
  }
}
