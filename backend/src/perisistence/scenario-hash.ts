import { createHash } from "node:crypto";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createScenarioHash(
  subject: string,
  assumption: string,
): string {
  const normalized = [normalize(subject), normalize(assumption)].join("|");

  return createHash("sha256").update(normalized).digest("hex");
}
