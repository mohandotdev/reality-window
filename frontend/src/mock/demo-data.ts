import type { Evaluation, Watch } from "@/types/watch";

/**
 * Deterministic demo data. Used only when demo mode is explicitly on
 * (see src/lib/demo-mode.ts). Never mixed with live responses.
 */

const HOUSTON_ID = "demo-houston";

const houstonSource = {
  name: "Rent Responsibly",
  articleTitle: "Houston adopts first-ever short-term rental regulations",
  url: "https://rentresponsibly.org/houston-short-term-rental-regulations/",
  lastUpdated: "February 26, 2026",
};

const houstonStillTrue = (id: string, createdAt: string): Evaluation => ({
  id,
  watchId: HOUSTON_ID,
  status: "still_true",
  stage: "finding",
  headline: "Your assumption is still supported.",
  summary:
    "Based on the latest information we collected, we found no meaningful evidence that contradicts your assumption.",
  reasoning: [
    "Your assumption says registered hosts can legally operate in Houston and pay a $275 annual registration fee.",
    "The latest version of the source still states that operators must register each property and pay $275 per year.",
    "No evidence was found that invalidates either part of the assumption.",
    "Conclusion: the assumption remains supported.",
  ],
  evidence: [
    {
      id: `${id}-e1`,
      claim: "Short-term rental operators must register each property with the city.",
      source: "Rent Responsibly",
      sourceUrl: houstonSource.url,
      excerpt:
        "Beginning January 1, operators of short-term rentals in Houston must register every unit they list with the city's Administration and Regulatory Affairs department.",
      relevance: "Confirms that operating remains legal for hosts who register.",
    },
    {
      id: `${id}-e2`,
      claim: "The registration fee is $275 per property, per year.",
      source: "City of Houston",
      sourceUrl: "https://www.houstontx.gov/",
      excerpt:
        "The annual registration fee is $275 per short-term rental property and must be renewed each year.",
      relevance: "Matches the fee stated in your assumption exactly.",
    },
    {
      id: `${id}-e3`,
      claim: "No repeal or amendment has been filed since the ordinance took effect.",
      source: "Houston City Council agenda archive",
      excerpt:
        "No items amending the short-term rental ordinance appear on council agendas in the period we reviewed.",
      relevance: "Nothing in the record suggests the rule is about to change.",
    },
  ],
  source: houstonSource,
  createdAt,
});

const remoteWorkChanged: Evaluation = {
  id: "demo-remote-eval-1",
  watchId: "demo-remote-work",
  status: "changed",
  stage: "finding",
  headline: "Your assumption may no longer be accurate.",
  summary:
    "The latest version of the policy page no longer matches what you told us you believed.",
  whatChanged:
    "Remote work is now capped at two days a week, and any additional day requires manager approval.",
  whyItMatters:
    "If you were planning around three remote days without approval, that arrangement now needs sign-off.",
  reasoning: [
    "Your assumption says employees may work remotely up to three days a week without approval.",
    "The current policy page states a two-day limit and adds an approval step beyond it.",
    "The change is stated directly on the source you asked us to watch.",
    "Conclusion: the assumption no longer holds.",
  ],
  evidence: [
    {
      id: "demo-remote-e1",
      claim: "The remote allowance is now two days per week.",
      source: "Company handbook",
      excerpt:
        "Employees may work remotely up to two days per week. Requests beyond two days require written approval from your manager.",
      relevance: "Directly contradicts the three-day figure in your assumption.",
    },
  ],
  source: {
    name: "Company handbook",
    articleTitle: "Working arrangements",
    lastUpdated: "August 18, 2026",
  },
  createdAt: "2026-08-23T09:12:00.000Z",
};

const apiNeedsReview: Evaluation = {
  id: "demo-api-eval-1",
  watchId: "demo-api-pricing",
  status: "needs_review",
  stage: "finding",
  headline: "The evidence isn't conclusive.",
  summary:
    "We found relevant material, but it doesn't clearly confirm or contradict your assumption.",
  reasoning: [
    "Your assumption says the legacy Charges endpoint is still supported for existing integrations.",
    "The changelog mentions a migration guide but does not state a removal date.",
    "The API reference still documents the endpoint without a deprecation banner.",
    "Conclusion: we can't say either way yet — worth a human look.",
  ],
  evidence: [
    {
      id: "demo-api-e1",
      claim: "A migration guide toward the Payment Intents API was published.",
      source: "Provider changelog",
      excerpt:
        "We recommend new integrations use Payment Intents. A migration guide is available for existing Charges integrations.",
      relevance: "Signals direction of travel, but stops short of removing support.",
    },
  ],
  source: {
    name: "Provider changelog",
    articleTitle: "API changes and migration notes",
    lastUpdated: "August 12, 2026",
  },
  createdAt: "2026-08-21T15:40:00.000Z",
};

export const demoWatches: Watch[] = [
  {
    id: HOUSTON_ID,
    subject: "Houston short-term rental regulations",
    assumption:
      "Short-term rentals remain legal for registered hosts in Houston with a $275 annual registration fee.",
    sourceUrl: houstonSource.url,
    status: "still_true",
    stage: "finding",
    createdAt: "2026-07-20T10:00:00.000Z",
    lastCheckedAt: "2026-08-24T06:58:00.000Z",
    latestEvaluation: houstonStillTrue("demo-houston-eval-4", "2026-08-24T06:58:00.000Z"),
  },
  {
    id: "demo-remote-work",
    subject: "Remote work policy at Company X",
    assumption: "Employees may work remotely up to three days a week without approval.",
    status: "changed",
    stage: "finding",
    createdAt: "2026-06-02T10:00:00.000Z",
    lastCheckedAt: remoteWorkChanged.createdAt,
    latestEvaluation: remoteWorkChanged,
  },
  {
    id: "demo-api-pricing",
    subject: "Legacy Charges endpoint support",
    assumption: "The Charges API is still available and supported for existing integrations.",
    status: "needs_review",
    stage: "finding",
    createdAt: "2026-05-11T10:00:00.000Z",
    lastCheckedAt: apiNeedsReview.createdAt,
    latestEvaluation: apiNeedsReview,
  },
];

export const demoEvaluations: Record<string, Evaluation[]> = {
  [HOUSTON_ID]: [
    houstonStillTrue("demo-houston-eval-4", "2026-08-24T06:58:00.000Z"),
    houstonStillTrue("demo-houston-eval-3", "2026-08-17T06:58:00.000Z"),
    houstonStillTrue("demo-houston-eval-2", "2026-08-10T06:58:00.000Z"),
    houstonStillTrue("demo-houston-eval-1", "2026-08-03T06:58:00.000Z"),
  ],
  "demo-remote-work": [
    remoteWorkChanged,
    {
      ...remoteWorkChanged,
      id: "demo-remote-eval-0",
      status: "still_true",
      stage: "finding",
      headline: "Your assumption is still supported.",
      summary: "The policy page matched your assumption at the time of this check.",
      whatChanged: undefined,
      whyItMatters: undefined,
      createdAt: "2026-08-16T09:12:00.000Z",
    },
  ],
  "demo-api-pricing": [apiNeedsReview],
};

/** The evaluation produced by "Check now" on a freshly created demo watch. */
export function demoFreshEvaluation(watch: Watch): Evaluation {
  if (/houston|rental/i.test(`${watch.subject} ${watch.assumption}`)) {
    return { ...houstonStillTrue(`${watch.id}-eval-${Date.now()}`, new Date().toISOString()), watchId: watch.id };
  }
  return {
    id: `${watch.id}-eval-${Date.now()}`,
    watchId: watch.id,
    status: "still_true",
    stage: "finding",
    headline: "Your assumption is still supported.",
    summary:
      "Based on the latest information we collected, we found no meaningful evidence that contradicts your assumption.",
    reasoning: [
      `Your assumption says: “${watch.assumption}”`,
      "We collected the current version of the source and compared it against that statement.",
      "Nothing in the fresh material contradicts it.",
      "Conclusion: the assumption remains supported.",
    ],
    evidence: [
      {
        id: `${watch.id}-e1`,
        claim: "The source still states the same terms you described.",
        source: watch.sourceUrl ? new URL(watch.sourceUrl).hostname.replace(/^www\./, "") : "Collected source",
        sourceUrl: watch.sourceUrl,
        excerpt:
          "The relevant passage on the page is unchanged from the previous collection and continues to describe the same requirements.",
        relevance: "Supports every part of your assumption.",
      },
    ],
    source: {
      name: watch.sourceUrl ? new URL(watch.sourceUrl).hostname.replace(/^www\./, "") : "Collected source",
      articleTitle: watch.subject,
      url: watch.sourceUrl,
      lastUpdated: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    },
    createdAt: new Date().toISOString(),
  };
}
