import type {
  Evaluation,
  EvidenceItem,
  PipelineStage,
  SourceInfo,
  Watch,
  WatchStatus,
} from "@/types/watch";

/**
 * Backend payloads are read defensively: the API is owned by another team and
 * field names differ slightly between endpoints. Nothing is fabricated here —
 * missing fields simply stay undefined and the UI omits that section.
 */

type Raw = Record<string, unknown>;

const asRecord = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});

function str(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Strip tags/entities so backend article HTML is never rendered as markup. */
export function toPlainText(input: string, maxLength = 600): string {
  const text = input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

/**
 * Translate any technical backend state into one of the five human statuses.
 * Unknown values fall back to "needs_review" rather than leaking raw strings.
 */
export function toStatus(raw: unknown, fallback: WatchStatus = "unchecked"): WatchStatus {
  if (typeof raw !== "string") return fallback;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (["still_true", "true", "supported", "unchanged", "valid", "confirmed"].includes(key))
    return "still_true";
  if (["changed", "invalid", "contradicted", "false", "outdated", "not_true"].includes(key))
    return "changed";
  if (["needs_review", "review", "uncertain", "ambiguous", "inconclusive", "partial"].includes(key))
    return "needs_review";
  if (["failed", "error", "failure", "cancelled", "canceled", "timeout"].includes(key))
    return "failed";
  if (["unchecked", "created", "new", "idle", "pending_first_check"].includes(key))
    return "unchecked";

  // In-flight technical states: anything running/queued/collecting is "checking".
  if (
    /(running|pending|queued|progress|process|collect|scrap|crawl|snapshot|evaluat|ai_flow|collector|start)/.test(
      key,
    )
  )
    return "checking";

  return "needs_review";
}

export function toStage(raw: unknown, status: WatchStatus): PipelineStage {
  const key = typeof raw === "string" ? raw.toLowerCase() : "";
  if (/collector_created|source|target|configur/.test(key)) return "source";
  if (/collect|scrap|crawl|snapshot|fetch/.test(key)) return "collect";
  if (/evaluat|ai_flow|reason|analy/.test(key)) return "evaluate";
  if (/finding|complete|done|finish/.test(key)) return "finding";

  if (status === "checking") return "collect";
  if (status === "unchecked") return "source";
  return "finding";
}

function toEvidence(raw: unknown, index: number): EvidenceItem {
  const e = asRecord(raw);
  const excerptRaw = str(e["excerpt"], e["snippet"], e["quote"], e["text"], e["content"]);
  return {
    id: str(e["id"], e["_id"]) ?? `evidence-${index}`,
    claim: str(e["claim"], e["statement"], e["title"], e["headline"]),
    source: str(e["source"], e["publisher"], e["site"], e["domain"], e["sourceName"]),
    sourceUrl: str(e["sourceUrl"], e["url"], e["link"]),
    excerpt: excerptRaw ? toPlainText(excerptRaw) : undefined,
    relevance: str(e["relevance"], e["reason"], e["why"], e["explanation"]),
  };
}

function toSource(raw: unknown): SourceInfo | undefined {
  const s = asRecord(raw);
  const info: SourceInfo = {
    name: str(s["name"], s["publisher"], s["site"], s["source"]),
    articleTitle: str(s["articleTitle"], s["title"], s["headline"], s["article"]),
    url: str(s["url"], s["link"], s["sourceUrl"]),
    lastUpdated: str(s["lastUpdated"], s["updatedAt"], s["publishedAt"], s["date"]),
  };
  return Object.values(info).some(Boolean) ? info : undefined;
}

function toReasoning(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const items = raw.map((r) => (typeof r === "string" ? r : str(asRecord(r)["text"]))).filter(Boolean);
    return items.length ? (items as string[]) : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(/\n{2,}|\n(?=[A-Z])/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return undefined;
}

export function toEvaluation(raw: unknown, watchId: string): Evaluation | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const e = asRecord(raw);
  const status = toStatus(e["status"] ?? e["result"] ?? e["verdict"] ?? e["state"], "needs_review");
  const evidenceRaw = e["evidence"] ?? e["evidenceItems"] ?? e["sources"] ?? [];

  return {
    id: str(e["id"], e["_id"], e["evaluationId"]) ?? `${watchId}-eval`,
    watchId: str(e["watchId"], e["watch_id"]) ?? watchId,
    status,
    stage: toStage(e["stage"] ?? e["phase"] ?? e["status"], status),
    headline:
      str(e["headline"], e["title"], e["verdictText"]) ?? defaultHeadline(status),
    summary: str(e["summary"], e["description"], e["message"], e["answer"]),
    reasoning: toReasoning(e["reasoning"] ?? e["explanation"] ?? e["rationale"]),
    whatChanged: str(e["whatChanged"], e["change"], e["delta"]),
    whyItMatters: str(e["whyItMatters"], e["impact"], e["significance"]),
    evidence: Array.isArray(evidenceRaw) ? evidenceRaw.map(toEvidence) : [],
    source: toSource(e["source"] ?? e["article"] ?? e["origin"]),
    createdAt: str(e["createdAt"], e["created_at"], e["completedAt"], e["timestamp"]) ?? new Date().toISOString(),
    error: status === "failed" ? str(e["error"], e["errorMessage"]) : undefined,
  };
}

export function defaultHeadline(status: WatchStatus): string {
  switch (status) {
    case "still_true":
      return "Your assumption is still supported.";
    case "changed":
      return "Your assumption may no longer be accurate.";
    case "needs_review":
      return "The evidence isn't conclusive.";
    case "failed":
      return "We couldn't complete this check.";
    case "checking":
      return "Checking the latest evidence…";
    default:
      return "We haven't checked this yet.";
  }
}

export function toWatch(raw: unknown): Watch {
  const w = asRecord(raw);
  const id = str(w["id"], w["_id"], w["watchId"]) ?? "unknown";
  const latest = toEvaluation(
    w["latestEvaluation"] ?? w["latest_evaluation"] ?? w["lastEvaluation"] ?? w["evaluation"],
    id,
  );
  const status = toStatus(
    w["status"] ?? w["state"] ?? latest?.status,
    latest ? latest.status : "unchecked",
  );

  return {
    id,
    subject: str(w["subject"], w["title"], w["name"]) ?? "Untitled watch",
    assumption: str(w["assumption"], w["belief"], w["claim"]) ?? "",
    sourceUrl: str(w["sourceUrl"], w["source_url"], w["url"]),
    status,
    stage: toStage(w["stage"] ?? w["phase"] ?? w["status"], status),
    createdAt: str(w["createdAt"], w["created_at"]) ?? new Date().toISOString(),
    lastCheckedAt: str(w["lastCheckedAt"], w["last_checked_at"], w["checkedAt"], latest?.createdAt),
    latestEvaluation: latest,
  };
}

export function toWatchList(raw: unknown): Watch[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)["watches"])
      ? (asRecord(raw)["watches"] as unknown[])
      : Array.isArray(asRecord(raw)["data"])
        ? (asRecord(raw)["data"] as unknown[])
        : [];
  return list.map(toWatch);
}

export function toEvaluationList(raw: unknown, watchId: string): Evaluation[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)["evaluations"])
      ? (asRecord(raw)["evaluations"] as unknown[])
      : Array.isArray(asRecord(raw)["data"])
        ? (asRecord(raw)["data"] as unknown[])
        : [];
  return list
    .map((item) => toEvaluation(item, watchId))
    .filter((e): e is Evaluation => Boolean(e))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
