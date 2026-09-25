import type { WatchSource } from "./types.js";

export function findNextEligibleSource(
  sources: WatchSource[],
  currentUrl: string,
): WatchSource | undefined {
  const currentIndex = sources.findIndex((source) => source.url === currentUrl);

  if (currentIndex === -1) {
    return undefined;
  }

  return sources
    .slice(currentIndex + 1)
    .find((source) => source.eligibility === "ELIGIBLE");
}
