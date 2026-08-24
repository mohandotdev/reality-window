import { isDemoMode } from "@/lib/demo-mode";
import type { CreateWatchInput, Evaluation, Watch } from "@/types/watch";
import { apiRequest, endpoints } from "./api-client";
import { demoBackend } from "./demo-backend";
import { toEvaluationList, toWatch, toWatchList } from "./normalize";

/**
 * Single service layer for watches. Components and hooks call these functions;
 * they never call fetch directly. Live data is used whenever demo mode is off.
 */

export const watchService = {
  async list(): Promise<Watch[]> {
    if (isDemoMode()) return demoBackend.listWatches();
    return toWatchList(await apiRequest(endpoints.watches()));
  },

  async get(id: string): Promise<Watch> {
    if (isDemoMode()) return demoBackend.getWatch(id);
    return toWatch(await apiRequest(endpoints.watch(id)));
  },

  async create(input: CreateWatchInput): Promise<Watch> {
    if (isDemoMode()) return demoBackend.createWatch(input);
    return toWatch(
      await apiRequest(endpoints.watches(), {
        method: "POST",
        body: {
          subject: input.subject,
          assumption: input.assumption,
          ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
        },
      }),
    );
  },

  async evaluate(id: string): Promise<Watch> {
    if (isDemoMode()) return demoBackend.evaluate(id);
    return toWatch(await apiRequest(endpoints.evaluate(id), { method: "POST" }));
  },

  async history(id: string): Promise<Evaluation[]> {
    if (isDemoMode()) return demoBackend.listEvaluations(id);
    return toEvaluationList(await apiRequest(endpoints.evaluations(id)), id);
  },
};
