import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Container, Eyebrow, Panel } from "@/components/rw/primitives";
import { SiteFooter, SiteHeader } from "@/components/rw/site-chrome";
import { DemoToggle } from "@/components/rw/watch/demo-toggle";
import {
  BeliefToFinding,
  CheckHistory,
  EvidenceList,
  Reasoning,
  SourceSection,
} from "@/components/rw/watch/sections";
import { Pipeline, StatusArt, StatusTag } from "@/components/rw/watch/status";
import { useRunCheck, useWatch, useWatchHistory } from "@/hooks/use-watches";
import { relativeTime } from "@/lib/format";
import { friendlyError } from "@/services/api-client";

const title = "Your Reality Window — watch detail";
const description =
  "The current finding for one assumption: what you believed, what we found, the evidence behind it, and why.";

export const Route = createFileRoute("/watches/$watchId")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) =>
    search["check"] === "1" || search["check"] === true
      ? ({ check: true } as { check?: boolean })
      : ({} as { check?: boolean }),
  component: WatchDetail,
});

function WatchDetail() {
  const { watchId } = Route.useParams();
  const { check } = Route.useSearch();
  const { data: watch, isPending, error, refetch } = useWatch(watchId);
  const runCheckMutation = useRunCheck(watchId);
  const { data: history } = useWatchHistory(watchId, watch?.latestEvaluation?.id);
  const autoRan = useRef(false);
  // Local run state: the request that kicks off a check returns before the
  // check finishes, so the page tracks "starting" itself and then follows the
  // watch status returned by polling.
  const [starting, setStarting] = useState(false);
  const [checkError, setCheckError] = useState<unknown>(null);

  const runCheck = useCallback(() => {
    setCheckError(null);
    setStarting(true);
    runCheckMutation
      .mutateAsync()
      .catch((err: unknown) => setCheckError(err))
      .finally(() => setStarting(false));
  }, [runCheckMutation]);

  // A freshly created watch starts its first check by itself.
  useEffect(() => {
    if (check && watch && watch.status === "unchecked" && !autoRan.current) {
      autoRan.current = true;
      runCheck();
    }
  }, [check, watch, runCheck]);


  if (isPending) {
    return (
      <Shell>
        <p className="text-muted-foreground">Opening your window…</p>
      </Shell>
    );
  }

  if (error || !watch) {
    return (
      <Shell>
        <h1 className="text-4xl md:text-5xl">We couldn&rsquo;t open this watch</h1>
        <p className="mt-4 text-muted-foreground">{friendlyError(error)}</p>
        <div className="mt-8 flex flex-wrap gap-5">
          <Button variant="quiet" onClick={() => refetch()}>
            Try again
          </Button>
          <Link
            to="/watches"
            className="text-sm underline decoration-border-strong underline-offset-4 hover:text-accent"
          >
            Back to my watches
          </Link>
        </div>
      </Shell>
    );
  }

  const checking = watch.status === "checking" || starting;
  const evaluation = watch.latestEvaluation;
  const stage = checking ? (watch.stage ?? "collect") : (evaluation?.stage ?? watch.stage ?? "source");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-3xl py-16 md:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Eyebrow>Your Reality Window</Eyebrow>
            <h1 className="mt-4 text-4xl leading-tight md:text-5xl">{watch.subject}</h1>
          </div>
          <StatusArt status={checking ? "checking" : watch.status} className="h-24 w-24 md:h-32 md:w-32" />
        </div>

        <Panel className="mt-10 space-y-6">
          <div>
            <Eyebrow>Assumption</Eyebrow>
            <p className="mt-2 font-display text-2xl leading-snug">&ldquo;{watch.assumption}&rdquo;</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <StatusTag status={checking ? "checking" : watch.status} />
            <span className="text-sm text-muted-foreground">
              Checked {relativeTime(watch.lastCheckedAt)}
            </span>
          </div>
          <div className="border-t border-border pt-6">
            <Pipeline stage={stage} active={checking} />
          </div>
        </Panel>

        {/* ---- Result ---- */}

        {checking && (
          <section className="rule-top mt-12 pt-10">
            <p className="font-display text-3xl md:text-4xl">Checking the latest evidence…</p>
            <p className="mt-3 text-muted-foreground">
              We&rsquo;re collecting the source and comparing it against your assumption. This takes a
              few seconds.
            </p>
            <div className="mt-6 h-px w-full overflow-hidden bg-border" role="status" aria-live="polite">
              <div className="h-px w-1/3 animate-[rw-sweep_1.6s_ease-in-out_infinite] bg-accent" />
              <span className="sr-only">Check in progress</span>
            </div>
          </section>
        )}

        {!checking && checkError !== null && (
          <section className="rule-top mt-12 pt-10">
            <p className="font-display text-3xl">We couldn&rsquo;t complete the check</p>
            <p className="mt-3 text-muted-foreground">{friendlyError(checkError)}</p>
            <Button className="mt-6" onClick={runCheck}>
              Try again
            </Button>
          </section>
        )}

        {!checking && checkError === null && !evaluation && (
          <section className="rule-top mt-12 pt-10">
            <p className="font-display text-3xl md:text-4xl">We haven&rsquo;t checked this yet.</p>
            <p className="mt-3 text-muted-foreground">
              Run the first check and we&rsquo;ll tell you whether your assumption still holds.
            </p>
            <Button className="mt-6" onClick={runCheck}>
              Check now
            </Button>
          </section>
        )}

        {!checking && evaluation && evaluation.status === "failed" && (
          <section className="rule-top mt-12 pt-10">
            <p className="font-display text-3xl">We couldn&rsquo;t complete the check</p>
            <p className="mt-3 text-muted-foreground">
              Something went wrong while checking the source.
            </p>
            <Button className="mt-6" onClick={runCheck}>
              Try again
            </Button>
          </section>
        )}

        {!checking && evaluation && evaluation.status !== "failed" && (
          <div className="mt-12 space-y-12">
            <BeliefToFinding assumption={watch.assumption} evaluation={evaluation} />
            <Reasoning reasoning={evaluation.reasoning} />
            <EvidenceList evidence={evaluation.evidence} />
            <SourceSection source={evaluation.source ?? (watch.sourceUrl ? { url: watch.sourceUrl } : undefined)} />
            <section className="rule-top pt-10">
              <div className="flex flex-wrap items-center gap-5">
                <Button onClick={runCheck} disabled={starting}>
                  Check now
                </Button>
                <Link
                  to="/watches"
                  className="text-sm underline decoration-border-strong underline-offset-4 hover:text-accent"
                >
                  Back to my watches
                </Link>
              </div>
            </section>
            <CheckHistory evaluations={history ?? []} />
          </div>
        )}

        <div className="rule-top mt-16 pt-8">
          <DemoToggle />
        </div>
      </Container>
      <SiteFooter />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-3xl py-20">{children}</Container>
      <SiteFooter />
    </div>
  );
}
