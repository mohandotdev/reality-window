import axios from "axios";

const BRIGHT_DATA_API = "https://api.brightdata.com/request";

const BRIGHT_DATA_API_KEY = process.env["BRIGHT_DATA_API_KEY"];
const BRIGHT_DATA_ZONE = process.env["BRIGHT_DATA_ZONE"];

if (!BRIGHT_DATA_API_KEY) {
  throw new Error("BRIGHT_DATA_API_KEY is required");
}

if (!BRIGHT_DATA_ZONE) {
  throw new Error("BRIGHT_DATA_ZONE is required");
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface SerpResult {
  link: string;
  source?: string;
  display_link?: string;
  title: string;
  description?: string;
  snippet?: string;
  snippet_highlighted_words?: string[];
  rank?: number;
  global_rank?: number;

  extensions?: Array<{
    inline?: boolean;
    type?: string;
    text?: string;
  }>;

  icon?: string;
}

export interface SerpResponse {
  general: {
    search_engine: string;
    query: string;
    detected_query?: string;
    results_cnt: number;
    search_time?: number;
    language: string;
    country?: string;
    country_code?: string;
    location?: string;
    gl?: string;
    mobile?: boolean;
    basic_view?: boolean;
    search_type?: string;
    page_title?: string;
    timestamp: string;
  };

  input: {
    original_url: string;
    request_id?: string;
  };

  navigation?: Array<{
    title: string;
    href: string;
  }>;

  organic?: SerpResult[];
}

/**
 * This represents the response returned by Bright Data's
 * /request endpoint.
 *
 * IMPORTANT:
 * `body` is a JSON string, not the parsed SERP response.
 */
export interface BrightDataSerpResult {
  status_code: number;
  headers?: Record<string, string>;
  body: string;
}

/**
 * Source returned to the rest of the application.
 */
export interface CleanSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  sourceType: SourceType;
}

export type SourceType = "government" | "forum" | "social" | "unknown";

/* -------------------------------------------------------------------------- */
/* Restricted domains                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Domains that we do not want to pass downstream to the LLM.
 *
 * These are intentionally handled BEFORE the LLM.
 */
const RESTRICTED_DOMAINS = new Set([
  // Forums
  "reddit.com",

  // Social platforms
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "tiktok.com",

  // Add other domains here if required.
]);

/**
 * Government domains are handled separately because we don't want
 * to maintain a massive list of every government domain.
 *
 * Examples:
 *   houstontx.gov
 *   nyc.gov
 *   usa.gov
 *   texas.gov
 */
const GOVERNMENT_TLDS = [".gov"];

/* -------------------------------------------------------------------------- */
/* Domain helpers                                                             */
/* -------------------------------------------------------------------------- */

function normalizeDomain(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
}

function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return normalizeDomain(parsed.hostname);
  } catch {
    return "";
  }
}

function isGovernmentDomain(domain: string): boolean {
  return GOVERNMENT_TLDS.some((tld) => domain.endsWith(tld));
}

function getSourceType(domain: string): SourceType {
  if (isGovernmentDomain(domain)) {
    return "government";
  }

  if (domain === "reddit.com" || domain.endsWith(".reddit.com")) {
    return "forum";
  }

  if (
    domain === "facebook.com" ||
    domain.endsWith(".facebook.com") ||
    domain === "instagram.com" ||
    domain.endsWith(".instagram.com") ||
    domain === "twitter.com" ||
    domain.endsWith(".twitter.com") ||
    domain === "x.com" ||
    domain.endsWith(".x.com") ||
    domain === "linkedin.com" ||
    domain.endsWith(".linkedin.com") ||
    domain === "tiktok.com" ||
    domain.endsWith(".tiktok.com")
  ) {
    return "social";
  }

  return "unknown";
}

function isRestrictedDomain(domain: string): boolean {
  if (!domain) {
    return true;
  }

  if (isGovernmentDomain(domain)) {
    return true;
  }

  if (RESTRICTED_DOMAINS.has(domain)) {
    return true;
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* URL normalization                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Normalize URLs so that the same page doesn't appear multiple times.
 *
 * Examples:
 *
 * https://example.com/page
 * https://example.com/page/
 *
 * become:
 *
 * https://example.com/page
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove www.
    parsed.hostname = parsed.hostname.replace(/^www\./, "");

    // Remove hash fragments.
    parsed.hash = "";

    // Remove common tracking parameters.
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
    ];

    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    // Remove trailing slash except for root.
    let pathname = parsed.pathname;

    if (pathname.length > 1) {
      pathname = pathname.replace(/\/+$/, "");
    }

    parsed.pathname = pathname;

    return parsed.toString();
  } catch {
    return url.trim();
  }
}

/* -------------------------------------------------------------------------- */
/* Snippet cleanup                                                            */
/* -------------------------------------------------------------------------- */

function cleanSnippet(snippet: string): string {
  return snippet
    .replace(/\s+/g, " ")
    .replace(/Read more\.?$/i, "")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Bright Data request                                                        */
/* -------------------------------------------------------------------------- */

export async function searchGoogle(
  query: string,
): Promise<BrightDataSerpResult> {
  const params = new URLSearchParams();

  params.set("q", query);
  params.set("gl", "us");
  params.set("hl", "en");

  // Houston geographic targeting
  params.set("uule", "w+CAIQICImSG91c3RvbixUZXhhcyxVbml0ZWQgU3RhdGVz");

  // Bright Data parsed JSON response
  params.set("brd_json", "1");

  // Desktop
  params.set("brd_mobile", "0");

  const url = `https://www.google.com/search?${params.toString()}`;

  const response = await axios.post<BrightDataSerpResult>(
    BRIGHT_DATA_API,
    {
      zone: BRIGHT_DATA_ZONE,
      url,
      format: "json",
      method: "GET",
      country: "us",
    },
    {
      headers: {
        Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    },
  );

  if (response.status !== 200) {
    console.error(`SERP request failed with status ${response.status}`);

    return {
      status_code: response.status,
      headers: response.headers as Record<string, string>,
      body: "",
    };
  }

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* Parse Bright Data response                                                 */
/* -------------------------------------------------------------------------- */

function parseSerpResponse(result: BrightDataSerpResult): SerpResponse | null {
  if (!result.body || !result.body.trim()) {
    console.warn(`Empty SERP body received. status=${result.status_code}`);

    return null;
  }

  try {
    return JSON.parse(result.body) as SerpResponse;
  } catch (error) {
    console.error("Failed to parse SERP body:", error);

    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Extract sources                                                            */
/* -------------------------------------------------------------------------- */

function extractSources(serpResults: BrightDataSerpResult[]): SerpResult[] {
  return serpResults.flatMap((result) => {
    const parsed = parseSerpResponse(result);

    if (!parsed) {
      return [];
    }

    return parsed.organic ?? [];
  });
}

/* -------------------------------------------------------------------------- */
/* Restriction + cleanup                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Main source-cleaning pipeline.
 *
 * Pipeline:
 *
 * raw SERP responses
 *       ↓
 * parse response
 *       ↓
 * extract organic results
 *       ↓
 * remove restricted domains
 *       ↓
 * normalize URLs
 *       ↓
 * deduplicate
 *       ↓
 * clean snippets
 *       ↓
 * return clean sources
 */
export function cleanSources(
  serpResults: BrightDataSerpResult[],
  limit = 10,
): CleanSource[] {
  const organicResults = extractSources(serpResults);

  console.log(`Raw sources: ${organicResults.length}`);

  const seenUrls = new Set<string>();

  const cleaned: CleanSource[] = [];

  for (const item of organicResults) {
    if (!item.link) {
      continue;
    }

    const domain = getDomain(item.link);

    if (!domain) {
      continue;
    }

    const sourceType = getSourceType(domain);

    /* -------------------------- Restriction step ------------------------- */

    if (isRestrictedDomain(domain)) {
      const reason = isGovernmentDomain(domain)
        ? "restricted-government-domain"
        : `restricted-domain:${domain}`;

      console.log(
        `Restricted source removed: ${item.link} ` +
          `(type=${sourceType}, reason=${reason})`,
      );

      continue;
    }

    /* -------------------------- URL normalization ------------------------ */

    const normalizedUrl = normalizeUrl(item.link);

    /* ----------------------------- Deduplication ------------------------- */

    if (seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);

    /* --------------------------- Snippet cleanup ------------------------- */

    const snippet = cleanSnippet(item.description ?? item.snippet ?? "");

    cleaned.push({
      title: item.title ?? "",
      url: normalizedUrl,
      snippet,
      domain,
      sourceType,
    });
  }

  /* ------------------------------- Limit -------------------------------- */

  const limited = cleaned.slice(0, limit);

  console.log(`Clean sources: ${limited.length}`);

  return limited;
}

/* -------------------------------------------------------------------------- */
/* Search + clean convenience function                                        */
/* -------------------------------------------------------------------------- */

/**
 * Search Google using multiple queries and return a single
 * cleaned source list.
 */
export async function searchGoogleSources(
  queries: string[],
  limit = 10,
): Promise<CleanSource[]> {
  const results = await Promise.allSettled(
    queries.map((query) => searchGoogle(query)),
  );

  const serpResults: BrightDataSerpResult[] = results
    .filter(
      (result): result is PromiseFulfilledResult<BrightDataSerpResult> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  const failedCount = results.length - serpResults.length;

  if (failedCount > 0) {
    console.warn(`SERP requests failed: ${failedCount}/${results.length}`);
  }

  const sources = cleanSources(serpResults, limit);

  if (sources.length === 0) {
    console.warn(
      "No usable SERP sources available. LLM reasoning should not proceed.",
    );
  }

  return sources;
}
