import type {
  ApiChangedField,
  ApiEvaluation,
  ApiScraper,
  ApiWatch,
  ApiWatchSource,
  WatchDetailResponse,
  WatchListItemResponse,
} from "@/types/api";
import type {
  Evaluation,
  EvidenceItem,
  PipelineStage,
  SourceInfo,
  Watch,
  WatchStatus,
} from "@/types/watch";

/**
 * Backend payloads are mapped here. Missing fields stay omitted —
 * nothing is fabricated.
 */

type Raw = Record<string, unknown>;

const asRecord = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});

function str(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  }
  return undefined;
}

function iso(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value.trim();
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

const PREPARING_STATUSES = new Set(["PENDING", "CREATING", "AI_FLOW_RUNNING"]);
const READY_STATUSES = new Set(["READY", "APPROVED"]);

export function normalizeScraperStatus(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim().toUpperCase() : null;
}

/**
 * Map scraper status + optional evaluation verdict to product copy keys.
 * Raw backend strings never become the primary UI label.
 */
export function toProductStatus(
  scraperStatus: string | null | undefined,
  verdict?: string | null,
): WatchStatus {
  if (verdict) {
    const key = verdict.trim().toUpperCase();
    if (key === "STILL_TRUE") return "still_true";
    if (key === "CHANGED") return "changed";
    if (key === "UNCERTAIN") return "needs_review";
  }

  if (!scraperStatus) return "unchecked";

  const status = scraperStatus.trim().toUpperCase();
  if (PREPARING_STATUSES.has(status)) return "preparing";
  if (status === "REVIEW_REQUIRED" || status === "FAILED") return "needs_review";
  if (READY_STATUSES.has(status)) return "ready";
  if (status === "RUNNING") return "checking";
  if (status === "COMPLETED") return "evidence_received";
  if (status === "UNAVAILABLE") return "unavailable";

  return "needs_review";
}

/** @deprecated Use toProductStatus for live payloads. Kept for demo/legacy strings. */
export function toStatus(raw: unknown, fallback: WatchStatus = "unchecked"): WatchStatus {
  if (typeof raw !== "string") return fallback;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (["still_true", "true", "supported", "unchanged", "valid", "confirmed"].includes(key))
    return "still_true";
  if (["changed", "invalid", "contradicted", "false", "outdated", "not_true"].includes(key))
    return "changed";
  if (["needs_review", "review", "uncertain", "ambiguous", "inconclusive", "partial", "review_required"].includes(key))
    return "needs_review";
  if (["unavailable"].includes(key)) return "unavailable";
  if (["preparing", "pending", "creating", "ai_flow_running"].includes(key)) return "preparing";
  if (["ready", "approved"].includes(key)) return "ready";
  if (["evidence_received", "completed"].includes(key)) return "evidence_received";
  if (["failed", "error", "failure", "cancelled", "canceled", "timeout"].includes(key))
    return "needs_review";
  if (["unchecked", "created", "new", "idle", "pending_first_check"].includes(key))
    return "unchecked";
  if (
    /(running|queued|progress|process|collect|scrap|crawl|snapshot|evaluat|start)/.test(key)
  )
    return "checking";

  return "needs_review";
}

export function toStage(raw: unknown, status: WatchStatus): PipelineStage {
  if (status === "preparing" || status === "unchecked" || status === "ready") return "source";
  if (status === "checking") return "collect";
  if (status === "evidence_received") return "evaluate";
  if (status === "still_true" || status === "changed" || status === "needs_review") return "finding";

  const key = typeof raw === "string" ? raw.toLowerCase() : "";
  if (/pending|creating|source|target|configur/.test(key)) return "source";
  if (/collect|scrap|crawl|snapshot|fetch|running/.test(key)) return "collect";
  if (/evaluat|ai_flow|reason|analy/.test(key)) return "evaluate";
  if (/finding|complete|done|finish/.test(key)) return "finding";
  return "source";
}

function toEvidence(raw: unknown, index: number): EvidenceItem {
  const e = asRecord(raw);
  const excerptRaw = str(
    e["sourceText"],
    e["source_text"],
    e["excerpt"],
    e["snippet"],
    e["quote"],
    e["text"],
    e["content"],
  );
  const item: EvidenceItem = {
    id: str(e["id"], e["_id"]) ?? `evidence-${index}`,
  };
  const claim = str(e["claim"], e["statement"], e["title"], e["headline"]);
  if (claim) item.claim = claim;
  const source = str(e["source"], e["publisher"], e["site"], e["domain"], e["sourceName"]);
  if (source) item.source = source;
  const sourceUrl = str(e["sourceUrl"], e["url"], e["link"]);
  if (sourceUrl) item.sourceUrl = sourceUrl;
  if (excerptRaw) item.excerpt = toPlainText(excerptRaw);
  const relevance = str(e["relevance"], e["reason"], e["why"], e["explanation"]);
  if (relevance) item.relevance = relevance;
  return item;
}

function toSource(raw: unknown): SourceInfo | undefined {
  const s = asRecord(raw);
  const info: SourceInfo = {};
  const name = str(s["name"], s["publisher"], s["site"], s["source"]);
  if (name) info.name = name;
  const articleTitle = str(s["articleTitle"], s["title"], s["headline"], s["article"]);
  if (articleTitle) info.articleTitle = articleTitle;
  const url = str(s["url"], s["link"], s["sourceUrl"]);
  if (url) info.url = url;
  const lastUpdated = str(s["lastUpdated"], s["updatedAt"], s["publishedAt"], s["date"]);
  if (lastUpdated) info.lastUpdated = lastUpdated;
  return Object.keys(info).length ? info : undefined;
}

function firstSourceUrl(sources: unknown): string | undefined {
  if (!Array.isArray(sources) || sources.length === 0) return undefined;
  const first = sources[0] as ApiWatchSource | unknown;
  const record = asRecord(first);
  return str(record["url"]);
}

function toReasoning(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const items = raw
      .map((r) => (typeof r === "string" ? r : str(asRecord(r)["text"])))
      .filter((item): item is string => Boolean(item));
    return items.length ? items : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parts = raw
      .split(/\n{2,}|\n(?=[A-Z])/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length ? parts : undefined;
  }
  return undefined;
}

function toWhatChanged(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const lines: string[] = [];
  for (const item of raw) {
    const field = asRecord(item) as ApiChangedField & Raw;
    const name = str(field["field"]);
    if (!name) continue;
    const previous = field["previousValue"];
    const current = field["currentValue"];
    const prevText = previous === undefined || previous === null ? undefined : String(previous);
    const currText = current === undefined || current === null ? undefined : String(current);
    if (prevText && currText) lines.push(`${name} changed from ${prevText} to ${currText}.`);
    else if (currText) lines.push(`${name} is now ${currText}.`);
    else lines.push(name);
  }
  return lines.length ? lines.join(" ") : undefined;
}

export function toEvaluation(raw: unknown, watchId: string): Evaluation | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const e = asRecord(raw) as ApiEvaluation & Raw;
  const verdict = str(e["verdict"], e["status"], e["result"], e["state"]);
  const status = toProductStatus(null, verdict) === "unchecked"
    ? toStatus(verdict, "needs_review")
    : toProductStatus(null, verdict);
  const evidenceRaw = e["evidence"] ?? e["evidenceItems"] ?? e["sources"] ?? [];

  const evaluation: Evaluation = {
    id: str(e["id"], e["_id"], e["evaluationId"]) ?? `${watchId}-eval`,
    watchId: str(e["watchId"], e["watch_id"]) ?? watchId,
    status: verdict ? status : toStatus(verdict, "needs_review"),
    stage: "finding",
    headline: str(e["headline"], e["title"], e["verdictText"]) ?? defaultHeadline(status),
    evidence: Array.isArray(evidenceRaw) ? evidenceRaw.map(toEvidence) : [],
    createdAt: iso(e["createdAt"] ?? e["created_at"] ?? e["completedAt"] ?? e["timestamp"]) ?? new Date().toISOString(),
  };

  const summary = str(e["summary"], e["description"], e["message"], e["answer"]);
  if (summary) evaluation.summary = summary;
  const reasoning = toReasoning(e["reasoning"] ?? e["explanation"] ?? e["rationale"]);
  if (reasoning) evaluation.reasoning = reasoning;
  const whatChanged = toWhatChanged(e["changedFields"] ?? e["whatChanged"] ?? e["change"] ?? e["delta"]);
  if (whatChanged) evaluation.whatChanged = whatChanged;
  const whyItMatters = str(e["whyItMatters"], e["impact"], e["significance"]);
  if (whyItMatters) evaluation.whyItMatters = whyItMatters;
  const source = toSource(e["source"] ?? e["article"] ?? e["origin"]);
  if (source) evaluation.source = source;
  if (evaluation.status === "failed") {
    const error = str(e["error"], e["errorMessage"]);
    if (error) evaluation.error = error;
  }
  return evaluation;
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
    case "preparing":
      return "Preparing the source check…";
    case "ready":
      return "Ready to check the source.";
    case "evidence_received":
      return "Evidence is in. We haven't evaluated it yet.";
    case "unavailable":
      return "This check isn't available right now.";
    default:
      return "We haven't checked this yet.";
  }
}

function sourceFromWatch(watch: ApiWatch | Raw): string | undefined {
  return firstSourceUrl(watch["sources"]);
}

export function toWatch(raw: unknown): Watch {
  const root = asRecord(raw);
  const nestedWatch = asRecord(root["watch"]);
  const hasNestedWatch = Boolean(str(nestedWatch["id"], nestedWatch["subject"]));
  const w = hasNestedWatch ? nestedWatch : root;
  const scraper = (root["scraper"] ?? w["scraper"]) as ApiScraper | null | undefined;
  const scraperRecord = scraper && typeof scraper === "object" ? asRecord(scraper) : {};
  const scraperStatus = normalizeScraperStatus(
    scraperRecord["status"] ?? w["scraperStatus"] ?? root["scraperStatus"],
  );

  const id = str(w["id"], w["_id"], w["watchId"], root["watchId"]) ?? "unknown";
  const latest = toEvaluation(
    root["evaluation"] ??
      w["latestEvaluation"] ??
      w["latest_evaluation"] ??
      w["lastEvaluation"] ??
      w["evaluation"],
    id,
  );

  const status = toProductStatus(scraperStatus, latest ? undefined : str(asRecord(root["latestEvaluation"] ?? w["latestEvaluation"])["verdict"]));
  const resolvedStatus = latest ? latest.status : status;

  const watch: Watch = {
    id,
    subject: str(w["subject"], w["title"], w["name"]) ?? "Untitled watch",
    assumption: str(w["assumption"], w["belief"], w["claim"]) ?? "",
    status: resolvedStatus,
    createdAt: iso(w["createdAt"] ?? w["created_at"]) ?? new Date().toISOString(),
    scraperStatus,
  };

  const sourceUrl = str(w["sourceUrl"], w["source_url"]) ?? sourceFromWatch(w as ApiWatch);
  if (sourceUrl) watch.sourceUrl = sourceUrl;
  watch.stage = toStage(scraperStatus, resolvedStatus);
  const lastCheckedAt = iso(
    w["lastCheckedAt"] ??
      w["last_checked_at"] ??
      w["lastScraperUpdateAt"] ??
      scraperRecord["lastRunAt"] ??
      latest?.createdAt,
  );
  if (lastCheckedAt) watch.lastCheckedAt = lastCheckedAt;
  if (latest) watch.latestEvaluation = latest;
  if (scraperRecord["schema"] !== undefined) watch.scraperSchema = scraperRecord["schema"];
  return watch;
}

export function toWatchDetail(payload: WatchDetailResponse): Watch {
  return toWatch(payload);
}

export function toWatchListItem(raw: unknown): Watch {
  const item = asRecord(raw) as WatchListItemResponse & Raw;
  const scraperStatus = normalizeScraperStatus(item["scraperStatus"]);
  const latestRaw = item["latestEvaluation"];
  const latestRecord = asRecord(latestRaw);
  const verdict = str(latestRecord["verdict"]);
  const status = toProductStatus(scraperStatus, verdict);
  const latest = latestRaw ? toEvaluation({ ...latestRecord, verdict }, str(item["id"]) ?? "unknown") : undefined;

  const watch: Watch = {
    id: str(item["id"], item["watchId"]) ?? "unknown",
    subject: str(item["subject"]) ?? "Untitled watch",
    assumption: str(item["assumption"]) ?? "",
    status: latest ? latest.status : status,
    createdAt: iso(item["createdAt"]) ?? new Date().toISOString(),
    scraperStatus,
  };
  watch.stage = toStage(scraperStatus, watch.status);
  const lastCheckedAt = iso(item["lastScraperUpdateAt"] ?? latestRecord["createdAt"] ?? latest?.createdAt);
  if (lastCheckedAt) watch.lastCheckedAt = lastCheckedAt;
  if (latest) watch.latestEvaluation = latest;
  return watch;
}

export function toWatchList(raw: unknown): Watch[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)["watches"])
      ? (asRecord(raw)["watches"] as unknown[])
      : Array.isArray(asRecord(raw)["data"])
        ? (asRecord(raw)["data"] as unknown[])
        : [];
  return list.map(toWatchListItem);
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

export function isPreparingStatus(status: string | null | undefined): boolean {
  const normalized = normalizeScraperStatus(status);
  return normalized !== null && PREPARING_STATUSES.has(normalized);
}

export function isReadyToRun(status: string | null | undefined): boolean {
  const normalized = normalizeScraperStatus(status);
  return normalized !== null && READY_STATUSES.has(normalized);
}

export function isApprovableSchema(schema: unknown): schema is { name: string; fields: unknown[] } {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return false;
  const record = schema as Raw;
  return typeof record["name"] === "string" && Array.isArray(record["fields"]);
}
