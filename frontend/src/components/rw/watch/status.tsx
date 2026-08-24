import checkingArt from "@/assets/state-checking.png";
import stillTrueArt from "@/assets/state-still-true.png";
import changedArt from "@/assets/state-changed.png";
import needsReviewArt from "@/assets/state-needs-review.png";
import { cn } from "@/lib/utils";
import type { PipelineStage, WatchStatus } from "@/types/watch";
import { STATUS_LABEL } from "@/types/watch";

type StatusMeta = {
  label: string;
  dot: string;
  text: string;
  art?: string;
  alt?: string;
};

export const statusMeta: Record<WatchStatus, StatusMeta> = {
  unchecked: { label: STATUS_LABEL.unchecked, dot: "bg-border-strong", text: "text-muted-foreground" },
  preparing: {
    label: STATUS_LABEL.preparing,
    dot: "bg-accent",
    text: "text-accent",
    art: checkingArt,
    alt: "A person leafing through documents, looking for the answer",
  },
  ready: { label: STATUS_LABEL.ready, dot: "bg-border-strong", text: "text-muted-foreground" },
  checking: {
    label: STATUS_LABEL.checking,
    dot: "bg-accent",
    text: "text-accent",
    art: checkingArt,
    alt: "A person leafing through documents, looking for the answer",
  },
  evidence_received: {
    label: STATUS_LABEL.evidence_received,
    dot: "bg-accent",
    text: "text-accent",
    art: checkingArt,
    alt: "A person leafing through documents, looking for the answer",
  },
  still_true: {
    label: STATUS_LABEL.still_true,
    dot: "bg-still-true",
    text: "text-still-true",
    art: stillTrueArt,
    alt: "A person calmly closing a laptop",
  },
  changed: {
    label: STATUS_LABEL.changed,
    dot: "bg-accent",
    text: "text-accent",
    art: changedArt,
    alt: "A person noticing something important on a page",
  },
  needs_review: {
    label: STATUS_LABEL.needs_review,
    dot: "bg-border-strong",
    text: "text-foreground",
    art: needsReviewArt,
    alt: "A person holding two conflicting documents",
  },
  unavailable: {
    label: STATUS_LABEL.unavailable,
    dot: "bg-border-strong",
    text: "text-muted-foreground",
    art: needsReviewArt,
    alt: "A person holding two conflicting documents",
  },
  failed: { label: STATUS_LABEL.failed, dot: "bg-destructive", text: "text-destructive" },
};

export function StatusTag({ status, className }: { status: WatchStatus; className?: string }) {
  const meta = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", meta.text, className)}>
      <span
        className={cn(
          "size-2 rounded-full",
          meta.dot,
          (status === "checking" || status === "preparing") && "animate-pulse",
        )}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}

export function StatusArt({ status, className }: { status: WatchStatus; className?: string }) {
  const meta = statusMeta[status];
  if (!meta.art) return null;
  return (
    <img
      src={meta.art}
      alt={meta.alt ?? ""}
      width={768}
      height={768}
      loading="lazy"
      className={cn("h-40 w-40 object-contain mix-blend-multiply opacity-90", className)}
    />
  );
}

/* ---------- Pipeline ---------- */

const stages: { key: PipelineStage; label: string }[] = [
  { key: "source", label: "Source" },
  { key: "collect", label: "Collect" },
  { key: "evaluate", label: "Evaluate" },
  { key: "finding", label: "Finding" },
];

export function Pipeline({
  stage,
  active = false,
  className,
}: {
  stage: PipelineStage;
  /** True while a run is in flight — highlights the current stage. */
  active?: boolean;
  className?: string;
}) {
  const currentIndex = stages.findIndex((s) => s.key === stage);

  return (
    <ol className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)} aria-label="Check pipeline">
      {stages.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <li key={s.key} className="flex items-center gap-3">
            <span
              className={cn(
                "eyebrow transition-colors",
                done && "text-foreground",
                current && (active ? "text-accent" : "text-foreground"),
              )}
              aria-current={current ? "step" : undefined}
            >
              <span
                className={cn(
                  "mr-2 inline-block size-1.5 rounded-full align-middle",
                  done ? "bg-foreground" : current ? (active ? "bg-accent animate-pulse" : "bg-foreground") : "bg-border-strong",
                )}
                aria-hidden
              />
              {s.label}
            </span>
            {i < stages.length - 1 && (
              <span aria-hidden className="text-border-strong">
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
