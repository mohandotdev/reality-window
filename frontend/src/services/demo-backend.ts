import { demoEvaluations, demoFreshEvaluation, demoWatches } from "@/mock/demo-data";
import type { CreateWatchInput, Evaluation, Watch } from "@/types/watch";

/**
 * In-memory stand-in for the Reality Window API, used only in demo mode.
 * Deterministic: the Houston example always resolves to "Still true".
 */

let watches: Watch[] = demoWatches.map((w) => ({ ...w }));
const evaluations: Record<string, Evaluation[]> = Object.fromEntries(
  Object.entries(demoEvaluations).map(([k, v]) => [k, [...v]]),
);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const demoBackend = {
  async listWatches(): Promise<Watch[]> {
    await delay(180);
    return watches.map((w) => ({ ...w }));
  },

  async getWatch(id: string): Promise<Watch> {
    await delay(150);
    const watch = watches.find((w) => w.id === id);
    if (!watch) throw new Error("We couldn't find that watch.");
    return { ...watch };
  },

  async createWatch(input: CreateWatchInput): Promise<Watch> {
    await delay(500);
    const watch: Watch = {
      id: `demo-${Date.now().toString(36)}`,
      subject: input.subject,
      assumption: input.assumption,
      sourceUrl: input.sourceUrl,
      status: "unchecked",
      stage: "source",
      createdAt: new Date().toISOString(),
    };
    watches = [watch, ...watches];
    evaluations[watch.id] = [];
    return { ...watch };
  },

  async listEvaluations(watchId: string): Promise<Evaluation[]> {
    await delay(150);
    return (evaluations[watchId] ?? []).map((e) => ({ ...e }));
  },

  /** Runs the collect → evaluate → finding sequence on a timer. */
  async evaluate(watchId: string): Promise<Watch> {
    const watch = watches.find((w) => w.id === watchId);
    if (!watch) throw new Error("We couldn't find that watch.");

    const update = (patch: Partial<Watch>) => {
      watches = watches.map((w) => (w.id === watchId ? { ...w, ...patch } : w));
    };

    update({ status: "checking", stage: "source" });
    void (async () => {
      await delay(1200);
      update({ status: "checking", stage: "collect" });
      await delay(1800);
      update({ status: "checking", stage: "evaluate" });
      await delay(1800);
      const current = watches.find((w) => w.id === watchId);
      if (!current) return;
      const evaluation = demoFreshEvaluation(current);
      evaluations[watchId] = [evaluation, ...(evaluations[watchId] ?? [])];
      update({
        status: evaluation.status,
        stage: "finding",
        lastCheckedAt: evaluation.createdAt,
        latestEvaluation: evaluation,
      });
    })();

    return { ...watch, status: "checking", stage: "source" };
  },
};
