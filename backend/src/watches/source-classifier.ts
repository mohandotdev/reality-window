export type SourceType =
  | "government"
  | "military"
  | "social"
  | "forum"
  | "commercial"
  | "news"
  | "unknown";

export interface SourceClassification {
  sourceType: SourceType;
  fetchable: boolean;
  restrictionReason?: string;
}

const RESTRICTED_DOMAINS = new Set([
  // Social platforms
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",

  // Forums / community platforms
  "reddit.com",
]);

const RESTRICTED_TLDS = [".gov", ".mil"];

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function classifySourceDomain(hostname: string): SourceClassification {
  const host = hostname.toLowerCase().replace(/^www\./, "");

  // Government domains
  if (host.endsWith(".gov")) {
    return {
      sourceType: "government",
      fetchable: false,
      restrictionReason: "restricted-government-domain",
    };
  }

  // Military domains
  if (host.endsWith(".mil")) {
    return {
      sourceType: "military",
      fetchable: false,
      restrictionReason: "restricted-military-domain",
    };
  }

  // Explicitly restricted domains
  for (const domain of RESTRICTED_DOMAINS) {
    if (matchesDomain(host, domain)) {
      const sourceType: SourceType =
        domain === "reddit.com" ? "forum" : "social";

      return {
        sourceType,
        fetchable: false,
        restrictionReason: `restricted-domain:${domain}`,
      };
    }
  }

  return {
    sourceType: "unknown",
    fetchable: true,
  };
}
