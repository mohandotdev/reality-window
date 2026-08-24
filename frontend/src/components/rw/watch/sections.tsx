import { Eyebrow, Panel } from "@/components/rw/primitives";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Evaluation, EvidenceItem, SourceInfo } from "@/types/watch";
import { StatusTag } from "./status";

/* ---------- You said → We found → Result ---------- */

export function BeliefToFinding({
  assumption,
  evaluation,
}: {
  assumption: string;
  evaluation: Evaluation;
}) {
  return (
    <section className="rule-top pt-10" aria-labelledby="finding-heading">
      <h2 id="finding-heading" className="sr-only">
        Finding
      </h2>
      <div className="space-y-6">
        <div>
          <Eyebrow>You said</Eyebrow>
          <p className="mt-2 font-display text-2xl leading-snug text-muted-foreground md:text-3xl">
            &ldquo;{assumption}&rdquo;
          </p>
        </div>
        <div aria-hidden className="text-2xl text-border-strong">
          ↓
        </div>
        <div>
          <Eyebrow>We found</Eyebrow>
          <p className="mt-2 font-display text-2xl leading-snug md:text-3xl">
            {evaluation.headline}
          </p>
        </div>
        <div aria-hidden className="text-2xl text-border-strong">
          ↓
        </div>
        <div>
          <Eyebrow>Result</Eyebrow>
          <p
            className={cn(
              "mt-1 font-display text-5xl leading-none md:text-7xl",
              evaluation.status === "still_true" && "text-still-true",
              (evaluation.status === "changed" || evaluation.status === "checking") && "text-accent",
              evaluation.status === "failed" && "text-destructive",
            )}
          >
            {statusHeadline(evaluation)}
          </p>
          {evaluation.summary && (
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{evaluation.summary}</p>
          )}
        </div>
      </div>

      {(evaluation.whatChanged || evaluation.whyItMatters) && (
        <Panel className="mt-10 space-y-6">
          {evaluation.whatChanged && (
            <div>
              <Eyebrow>What changed</Eyebrow>
              <p className="mt-2 text-lg">{evaluation.whatChanged}</p>
            </div>
          )}
          {evaluation.whyItMatters && (
            <div className={cn(evaluation.whatChanged && "border-t border-border pt-6")}>
              <Eyebrow>Why it matters</Eyebrow>
              <p className="mt-2 text-lg">{evaluation.whyItMatters}</p>
            </div>
          )}
        </Panel>
      )}
    </section>
  );
}

function statusHeadline(evaluation: Evaluation): string {
  switch (evaluation.status) {
    case "still_true":
      return "Still true";
    case "changed":
      return "Something changed";
    case "needs_review":
      return "Needs review";
    case "failed":
      return "Check failed";
    case "checking":
      return "Checking";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "evidence_received":
      return "Evidence received";
    case "unavailable":
      return "Unavailable";
    default:
      return "Not checked yet";
  }
}

/* ---------- Reasoning ---------- */

export function Reasoning({ reasoning }: { reasoning?: string[] | undefined }) {
  if (!reasoning?.length) return null;
  return (
    <section className="rule-top pt-10" aria-labelledby="reasoning-heading">
      <h2 id="reasoning-heading" className="text-2xl md:text-3xl">
        Why we think this
      </h2>
      <div className="mt-6 max-w-2xl space-y-4 text-muted-foreground">
        {reasoning.map((line, i) => (
          <p key={i} className={cn(i === reasoning.length - 1 && "text-foreground")}>
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

/* ---------- Evidence ---------- */

export function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  if (!evidence.length) return null;
  return (
    <section className="rule-top pt-10" aria-labelledby="evidence-heading">
      <h2 id="evidence-heading" className="text-2xl md:text-3xl">
        Evidence
      </h2>
      <ul className="mt-6 border-t border-border">
        {evidence.map((item) => (
          <li key={item.id} className="border-b border-border py-6">
            {item.claim && <p className="font-display text-xl leading-snug">{item.claim}</p>}
            {item.excerpt && (
              <blockquote className="mt-3 border-l-2 border-border-strong pl-4 text-muted-foreground">
                {item.excerpt}
              </blockquote>
            )}
            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              {item.source && (
                <span className="font-mono text-xs text-muted-foreground">{item.source}</span>
              )}
              {item.sourceUrl && (
                <ExternalLink href={item.sourceUrl}>Open source</ExternalLink>
              )}
            </div>
            {item.relevance && (
              <p className="mt-3 text-sm">
                <span className="eyebrow mr-2">Relevance</span>
                {item.relevance}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Source ---------- */

export function SourceSection({ source }: { source?: SourceInfo | undefined }) {
  if (!source) return null;
  return (
    <section className="rule-top pt-10" aria-labelledby="source-heading">
      <h2 id="source-heading" className="text-2xl md:text-3xl">
        Source
      </h2>
      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        {source.name && (
          <div>
            <dt className="eyebrow">Source</dt>
            <dd className="mt-1 text-lg">{source.name}</dd>
          </div>
        )}
        {source.articleTitle && (
          <div>
            <dt className="eyebrow">Article</dt>
            <dd className="mt-1 text-lg">{source.articleTitle}</dd>
          </div>
        )}
        {source.lastUpdated && (
          <div>
            <dt className="eyebrow">Last updated</dt>
            <dd className="mt-1 text-lg">{formatDateTime(source.lastUpdated) || source.lastUpdated}</dd>
          </div>
        )}
        {source.url && (
          <div>
            <dt className="eyebrow">Link</dt>
            <dd className="mt-1">
              <ExternalLink href={source.url}>Open source</ExternalLink>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 text-sm underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
    >
      {children}
      <span aria-hidden>↗</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/* ---------- History ---------- */

export function CheckHistory({ evaluations }: { evaluations: Evaluation[] }) {
  if (!evaluations.length) return null;
  return (
    <section className="rule-top pt-10" aria-labelledby="history-heading">
      <h2 id="history-heading" className="text-2xl md:text-3xl">
        Check history
      </h2>
      <ul className="mt-6 border-t border-border">
        {evaluations.map((e) => (
          <li
            key={e.id}
            className="flex flex-col gap-1 border-b border-border py-4 sm:flex-row sm:items-baseline sm:gap-6"
          >
            <span className="font-mono text-xs text-muted-foreground sm:w-20">
              {formatDate(e.createdAt)}
            </span>
            <StatusTag status={e.status} className="sm:w-48" />
            <span className="text-sm text-muted-foreground">
              {e.whatChanged ?? e.summary ?? e.headline}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
