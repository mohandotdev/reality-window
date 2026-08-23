import { classifySourceDomain, type SourceType } from "./source-classifier.js";

export interface RawSource {
  title: string;
  url: string;
  snippet: string;
}

export interface CleanSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  sourceType: SourceType;
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);

    // Remove fragment because it doesn't represent
    // a different source page for our purposes.
    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

function cleanSnippet(snippet: string): string {
  return snippet.replace(/\s+/g, " ").trim();
}

export function cleanupSources(sources: RawSource[]): CleanSource[] {
  const cleanSources: CleanSource[] = [];

  for (const source of sources) {
    if (!source.url) {
      console.warn("Skipping source without URL");
      continue;
    }

    const normalizedUrl = normalizeUrl(source.url);

    if (!normalizedUrl) {
      console.warn(`Skipping invalid source URL: ${source.url}`);
      continue;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      console.warn(`Skipping invalid source URL: ${normalizedUrl}`);
      continue;
    }

    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    const classification = classifySourceDomain(hostname);

    if (!classification.fetchable) {
      console.log(
        `Restricted source removed: ${normalizedUrl} ` +
          `(type=${classification.sourceType}, ` +
          `reason=${classification.restrictionReason})`,
      );

      continue;
    }

    cleanSources.push({
      title: source.title.trim(),
      url: normalizedUrl,
      snippet: cleanSnippet(source.snippet),
      domain: hostname,
      sourceType: classification.sourceType,
    });
  }

  return cleanSources;
}
