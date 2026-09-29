import type { CreateWatchRequest, WatchPlan } from "./types.js";
import { searchGoogleSources } from "../brightdata/serp.js";
import { createLlmService } from "../llm/service.js";
import { title } from "process";

export async function createWatchPlan(
  request: CreateWatchRequest,
): Promise<WatchPlan> {
  const { subject, assumption } = request;

  const startedAt = Date.now();

  // --------------------------------
  // Phase 1: Generate search queries
  // --------------------------------

  const searchQueries = [
    subject,
    `${subject} latest update`,
    `${subject} current status`,
  ];

  // ---------------------------------
  // Phase 2: Search & Source cleanup
  // ---------------------------------
  const sourcesStarted = Date.now();

  const cleanedSources = await searchGoogleSources(searchQueries, 10);

  console.log(`SERP + cleanup: ${Date.now() - sourcesStarted}ms`);

  if (cleanedSources.length === 0) {
    throw new Error(
      "Unable to create watch plan: no usable sources were found.",
    );
  }

  const sources = cleanedSources.map((source) => ({
    title: source.title,
    url: source.url,
    snippet: source.snippet,
    eligibility: source.eligibility,
    exclusionReason: source.exclusionReason,
  }));

  // --------------------------------
  // Phase 3: LLM reasoning
  // --------------------------------
  const llmStarted = Date.now();

  const llmService = createLlmService();

  const reasoning = await llmService.reason({
    subject,
    assumption,
    sources,
  });

  console.log(`LLM reasoning: ${Date.now() - llmStarted}ms`);

  console.log(`Total planner time: ${Date.now() - startedAt}ms`);

  return {
    subject,
    assumption,
    searchQueries,
    sources,
    evidenceRequirements: reasoning.evidenceRequirements,
  };
}
