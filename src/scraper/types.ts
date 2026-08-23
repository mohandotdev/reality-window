/**
 * Information produced by the planning/reasoning stage
 * and used to generate a scraper.
 */
export interface ScraperTarget {
  url: string;
  title: string;
  instructions: string[];
  evidenceRequirements: string[];
}

/**
 * User-facing schema proposal generated for the target source.
 *
 * This is what the UI should display for verification
 * before the collector is created/run.
 */
export interface ScraperSchema {
  name: string;
  description?: string;

  fields: ScraperField[];
}

/**
 * A single field that the scraper should extract.
 */
export interface ScraperField {
  name: string;
  type: ScraperFieldType;
  description: string;
  required: boolean;
}

/**
 * Keep the initial schema types deliberately small.
 */
export type ScraperFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "array"
  | "object";

/**
 * Result returned after Scraper Studio generates
 * a schema/collector proposal.
 */
export interface ScraperGenerationResult {
  target: ScraperTarget;
  schema: ScraperSchema;

  /**
   * Identifier returned by Bright Data if a collector
   * has already been created.
   */
  collectorId?: string;
}

/**
 * User approval of the generated scraper schema.
 */
export interface ScraperApprovalRequest {
  schema: ScraperSchema;
}

/**
 * Request to create a collector after the schema
 * has been approved.
 */
export interface CreateCollectorRequest {
  target: ScraperTarget;
  schema: ScraperSchema;
}

/**
 * Collector created in Bright Data Scraper Studio.
 */
export interface Collector {
  collectorId: string;
  name: string;
  url: string;
  status: CollectorStatus;
}

/**
 * Internal collector lifecycle.
 */
export type CollectorStatus =
  | "CREATED"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

/**
 * Request to execute an existing collector.
 */
export interface RunCollectorRequest {
  collectorId: string;
}

/**
 * Structured data returned by the collector.
 *
 * We intentionally keep this generic because the schema
 * is dynamic and depends on the watch.
 */
export interface CollectorResult {
  collectorId: string;

  status: "COMPLETED" | "FAILED";

  data: Record<string, unknown>;

  collectedAt: string;
}

/**
 * Complete scraper state associated with a watch.
 */
export interface ScraperState {
  target: ScraperTarget;

  schema?: ScraperSchema;

  collector?: Collector;

  latestResult?: CollectorResult;
}
