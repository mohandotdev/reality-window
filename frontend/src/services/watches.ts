import { isDemoMode } from "@/lib/demo-mode";
import type {
  CreateWatchResponse,
  EvaluateResponse,
  EvaluationsResponse,
  ScraperEnvelope,
  ScraperProgressResponse,
  ScraperRunResponse,
  WatchDetailResponse,
  WatchListResponse,
} from "@/types/api";
import type { CreateWatchInput, Evaluation, Watch } from "@/types/watch";
import { ApiError, apiRequest, endpoints } from "./api-client";
import { demoBackend } from "./demo-backend";
import {
  isApprovableSchema,
  isPreparingStatus,
  isReadyToRun,
  normalizeScraperStatus,
  toEvaluationList,
  toWatch,
  toWatchList,
} from "./normalize";

const POLL_INTERVAL_MS = 2000;
const SETUP_TIMEOUT_MS = 240_000;
const RUN_TIMEOUT_MS = 240_000;

/**
 * Single service layer for watches. Components and hooks call these functions;
 * they never call fetch directly. Live data is used whenever demo mode is off.
 */

function abortError(): Error {
  return new DOMException("The check was cancelled.", "AbortError");
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function getDetail(id: string, signal?: AbortSignal): Promise<WatchDetailResponse> {
  return apiRequest<WatchDetailResponse>(endpoints.watch(id), { signal });
}

async function getScraper(id: string, signal?: AbortSignal): Promise<ScraperEnvelope> {
  return apiRequest<ScraperEnvelope>(endpoints.scraper(id), { signal });
}

async function createScraper(id: string, signal?: AbortSignal): Promise<ScraperEnvelope> {
  return apiRequest<ScraperEnvelope>(endpoints.scraper(id), { method: "POST", signal });
}

async function getProgress(id: string, signal?: AbortSignal): Promise<ScraperProgressResponse> {
  return apiRequest<ScraperProgressResponse>(endpoints.scraperProgress(id), { signal });
}

async function approveScraper(id: string, schema: unknown, signal?: AbortSignal): Promise<void> {
  await apiRequest(endpoints.scraperApprove(id), {
    method: "POST",
    body: { schema },
    signal,
  });
}

async function runScraper(id: string, signal?: AbortSignal): Promise<ScraperRunResponse> {
  return apiRequest<ScraperRunResponse>(endpoints.scraperRun(id), { method: "POST", signal });
}

async function evaluateWatch(id: string, signal?: AbortSignal): Promise<EvaluateResponse> {
  return apiRequest<EvaluateResponse>(endpoints.evaluate(id), { method: "POST", signal });
}

async function scraperStatus(id: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const envelope = await getScraper(id, signal);
    return normalizeScraperStatus(envelope.scraper?.status);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function pollUntil(
  id: string,
  isDone: (status: string | null) => boolean,
  timeoutMs: number,
  signal?: AbortSignal,
  useProgress = false,
): Promise<string | null> {
  const started = Date.now();
  let status = await scraperStatus(id, signal);

  while (!isDone(status)) {
    throwIfAborted(signal);
    if (Date.now() - started > timeoutMs) {
      throw new Error("This check is taking longer than expected. Try again in a moment.");
    }
    await sleep(POLL_INTERVAL_MS, signal);

    if (useProgress && isPreparingStatus(status)) {
      try {
        const progress = await getProgress(id, signal);
        status = normalizeScraperStatus(progress.scraper?.status);
        continue;
      } catch (error) {
        if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
          status = await scraperStatus(id, signal);
          continue;
        }
        throw error;
      }
    }

    const detail = await getDetail(id, signal);
    status = normalizeScraperStatus(detail.scraper?.status);
  }

  return status;
}

function isSetupTerminal(status: string | null): boolean {
  if (!status) return false;
  return !isPreparingStatus(status);
}

function isRunTerminal(status: string | null): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "UNAVAILABLE";
}

export const watchService = {
  async list(): Promise<Watch[]> {
    if (isDemoMode()) return demoBackend.listWatches();
    return toWatchList(await apiRequest<WatchListResponse>(endpoints.watches()));
  },

  async get(id: string): Promise<Watch> {
    if (isDemoMode()) return demoBackend.getWatch(id);
    return toWatch(await getDetail(id));
  },

  async create(input: CreateWatchInput): Promise<Watch> {
    if (isDemoMode()) return demoBackend.createWatch(input);
    const created = await apiRequest<CreateWatchResponse>(endpoints.watches(), {
      method: "POST",
      body: {
        subject: input.subject,
        assumption: input.assumption,
      },
    });
    return watchService.get(created.watchId);
  },

  async evaluate(id: string): Promise<Watch> {
    if (isDemoMode()) return demoBackend.evaluate(id);
    await evaluateWatch(id);
    return watchService.get(id);
  },

  async history(id: string): Promise<Evaluation[]> {
    if (isDemoMode()) return demoBackend.listEvaluations(id);
    return toEvaluationList(await apiRequest<EvaluationsResponse>(endpoints.evaluations(id)), id);
  },

  /**
   * Full check: ensure scraper exists, wait until it can run, run it,
   * wait for COMPLETED, then evaluate. Never calls the Bright Data webhook.
   */
  async runCheck(id: string, signal?: AbortSignal): Promise<Watch> {
    if (isDemoMode()) return demoBackend.evaluate(id);

    throwIfAborted(signal);

    let detail = await getDetail(id, signal);
    let status = normalizeScraperStatus(detail.scraper?.status);

    if (!detail.scraper) {
      await createScraper(id, signal);
      status = await scraperStatus(id, signal);
    }

    if (isPreparingStatus(status)) {
      status = await pollUntil(id, isSetupTerminal, SETUP_TIMEOUT_MS, signal, true);
    }

    if (status === "FAILED" || status === "UNAVAILABLE") {
      throw new Error("We couldn't complete the source check. Try again shortly.");
    }

    if (status === "REVIEW_REQUIRED") {
      const envelope = await getScraper(id, signal);
      const schema = envelope.scraper?.schema;
      if (!isApprovableSchema(schema)) {
        throw new Error("This watch needs a review before we can check the source.");
      }
      await approveScraper(id, schema, signal);
      status = await scraperStatus(id, signal);
    }

    const alreadyEvaluated = Boolean(detail.evaluation);
    const shouldRun =
      isReadyToRun(status) || (status === "COMPLETED" && alreadyEvaluated);

    if (shouldRun) {
      try {
        await runScraper(id, signal);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 409)) throw error;
      }
      status = "RUNNING";
    }

    if (status === "RUNNING") {
      status = await pollUntil(id, isRunTerminal, RUN_TIMEOUT_MS, signal, false);
    }

    if (status === "FAILED" || status === "UNAVAILABLE") {
      throw new Error("We couldn't complete the source check. Try again shortly.");
    }

    if (status === "COMPLETED") {
      await evaluateWatch(id, signal);
      return watchService.get(id);
    }

    // Already had a finding, or still waiting for a run-capable state.
    if (status === "READY" || status === "APPROVED") {
      throw new Error("The source check is still being prepared. Try again shortly.");
    }

    return watchService.get(id);
  },
};
