import { createFileRoute, Link } from "@tanstack/react-router";
import { ButtonLink, Container, Eyebrow } from "@/components/rw/primitives";
import { SiteFooter, SiteHeader } from "@/components/rw/site-chrome";
import { DemoToggle } from "@/components/rw/watch/demo-toggle";
import { StatusTag } from "@/components/rw/watch/status";
import { useWatchList } from "@/hooks/use-watches";
import { friendlyError } from "@/services/api-client";
import { relativeTime } from "@/lib/format";

const title = "My watches — Reality Window";
const description =
  "Every assumption Reality Window is keeping an eye on, with its current status and last check.";

export const Route = createFileRoute("/watches/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: WatchesPage,
});

function WatchesPage() {
  const { data: watches, isPending, error, refetch } = useWatchList();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Your workspace</Eyebrow>
            <h1 className="mt-4 text-4xl md:text-5xl">My watches</h1>
          </div>
          <DemoToggle />
        </div>

        {isPending && <p className="mt-12 text-muted-foreground">Loading your watches…</p>}

        {error && (
          <div className="mt-12">
            <p className="text-muted-foreground">{friendlyError(error)}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-sm underline decoration-border-strong underline-offset-4 hover:text-accent"
            >
              Try again
            </button>
          </div>
        )}

        {watches && watches.length === 0 && (
          <div className="mt-12">
            <p className="font-display text-2xl">Nothing is being watched yet.</p>
            <p className="mt-2 text-muted-foreground">
              Tell us one thing you believe, and we&rsquo;ll keep an eye on it.
            </p>
            <ButtonLink to="/create" className="mt-6">
              Create your first watch
            </ButtonLink>
          </div>
        )}

        {watches && watches.length > 0 && (
          <ul className="mt-12 border-t border-border">
            {watches.map((w) => (
              <li key={w.id} className="border-b border-border">
                <Link
                  to="/watches/$watchId"
                  params={{ watchId: w.id }}
                  className="group flex flex-col gap-3 py-6 transition-colors md:flex-row md:items-baseline md:justify-between md:gap-10"
                >
                  <div className="min-w-0">
                    <p className="font-display text-2xl leading-snug transition-colors group-hover:text-accent">
                      {w.subject}
                    </p>
                    <p className="mt-1 line-clamp-2 max-w-xl text-sm text-muted-foreground">
                      {w.assumption}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 md:items-end">
                    <StatusTag status={w.status} />
                    <span className="text-sm text-muted-foreground">
                      Checked {relativeTime(w.lastCheckedAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
      <SiteFooter />
    </div>
  );
}
