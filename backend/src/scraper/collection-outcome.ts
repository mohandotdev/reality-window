export type CollectionClassification =
  | {
      outcome: "SOURCE_UNAVAILABLE" | "SOURCE_BLOCKED";
      code?: string;
      message?: string;
    }
  | undefined;

export function classifyCollectionError(
  data: Record<string, unknown>[],
): CollectionClassification {
  for (const item of data) {
    const error = item["error"];
    const errorCode = item["error_code"];

    if (typeof error !== "string" && typeof errorCode !== "string") {
      continue;
    }

    const message = typeof error === "string" ? error : undefined;
    const code = typeof errorCode === "string" ? errorCode : undefined;

    const normalized = `${code ?? ""} ${message ?? ""}`.toLowerCase();

    if (
      normalized.includes("blocked") ||
      normalized.includes("access denied") ||
      normalized.includes("forbidden") ||
      normalized.includes("captcha")
    ) {
      return {
        outcome: "SOURCE_BLOCKED",
        code,
        message,
      };
    }

    return {
      outcome: "SOURCE_UNAVAILABLE",
      code,
      message,
    };
  }

  return undefined;
}