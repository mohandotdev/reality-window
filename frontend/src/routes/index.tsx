import { createFileRoute } from "@tanstack/react-router";
import heroIllustration from "@/assets/hero-watching.png";
import watcherIllustration from "@/assets/window-watcher.png";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Panel,
  Section,
  Status,
} from "@/components/rw/primitives";
import { SiteFooter, SiteHeader } from "@/components/rw/site-chrome";

const title = "Reality Window — stop checking, we'll tell you when reality changes";
const description =
  "Give us a fact you care about. Reality Window checks the source, evaluates new evidence, and tells you when your assumption no longer holds.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Landing,
});

const beliefs = [
  "Short-term rentals are legal in Houston.",
  "$275 is the annual registration fee.",
  "This policy remains active.",
  "This API is still available.",
  "This company still supports remote work.",
];

const steps = [
  {
    n: "01",
    title: "Tell us what you believe",
    body: "A subject you care about, and the assumption you're holding about it.",
  },
  {
    n: "02",
    title: "We check the source",
    body: "Fresh information is collected from the web on a schedule, so you don't open the tab.",
  },
  {
    n: "03",
    title: "We reason over the evidence",
    body: "The new information is compared against your assumption and the previous finding.",
  },
  {
    n: "04",
    title: "We tell you when reality changes",
    body: "No repeated manual checking. You hear from us when the answer moves.",
  },
];

const timeline = [
  { label: "Watch created", note: "You wrote down what you believe." },
  { label: "Source checked", note: "The city's rental ordinance page was retrieved." },
  { label: "Evidence found", note: "Registration remains required. Fee listed as $275/year." },
  { label: "Assumption evaluated", note: "Both parts of your assumption are supported." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <Container className="grid items-center gap-12 py-16 md:grid-cols-[1.05fr_1fr] md:py-24">
        <div>
          <Eyebrow>Reality Window</Eyebrow>
          <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl">
            Stop checking.
            <br />
            <span className="italic">We&rsquo;ll tell you</span> when reality changes.
          </h1>
          <p className="mt-7 max-w-xl text-lg text-muted-foreground">
            Give us a fact you care about. Reality Window checks the source, evaluates new
            evidence, and tells you when your assumption no longer holds.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <ButtonLink to="/create">Create a watch</ButtonLink>
            <ButtonLink to="/" hash="how-it-works" variant="link">
              See how it works
            </ButtonLink>
          </div>
        </div>
        <img
          src={heroIllustration}
          alt="A person buried under browser tabs, documents and notifications, with a calm companion watching a single window beside them"
          width={1200}
          height={1008}
          className="w-full max-w-lg justify-self-center"
        />
      </Container>

      {/* Problem */}
      <Section>
        <div className="grid gap-14 md:grid-cols-[1fr_1fr]">
          <div>
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-5 max-w-md text-4xl md:text-5xl">
              Some facts are only useful until they change.
            </h2>
          </div>
          <div>
            <ul className="space-y-0 border-t border-border">
              {beliefs.map((b) => (
                <li
                  key={b}
                  className="border-b border-border py-4 font-display text-2xl leading-snug md:text-[1.65rem]"
                >
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-md text-lg text-muted-foreground">
              The problem isn&rsquo;t finding the information once.{" "}
              <span className="text-foreground">
                The problem is knowing when it stops being true.
              </span>
            </p>
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section className="scroll-mt-16">
        <div id="how-it-works" className="grid gap-14 md:grid-cols-[1fr_1.4fr]">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-5 text-4xl md:text-5xl">Four steps, then quiet.</h2>
            <img
              src={watcherIllustration}
              alt="A person looking through a window frame with a magnifying glass"
              width={912}
              height={912}
              loading="lazy"
              className="mt-8 hidden w-56 md:block"
            />
          </div>
          <ol className="border-t border-border">
            {steps.map((s) => (
              <li key={s.n} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-border py-6">
                <span className="font-mono text-sm text-accent">{s.n}</span>
                <div>
                  <h3 className="text-2xl">{s.title}</h3>
                  <p className="mt-1.5 text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Example */}
      <Section>
        <Eyebrow>An example</Eyebrow>
        <h2 className="mt-5 max-w-2xl text-4xl md:text-5xl">
          Let&rsquo;s say you&rsquo;re watching Houston&rsquo;s short-term rental regulations.
        </h2>

        <div className="mt-12 grid gap-8 md:grid-cols-[1fr_1fr]">
          <Panel className="space-y-6">
            <div>
              <Eyebrow>Subject</Eyebrow>
              <p className="mt-2 text-lg">Houston short-term rental regulations</p>
            </div>
            <div className="border-t border-border pt-6">
              <Eyebrow>Assumption</Eyebrow>
              <p className="mt-2 font-display text-2xl leading-snug">
                &ldquo;Short-term rentals remain legal for registered hosts, with a $275 annual
                registration fee.&rdquo;
              </p>
            </div>
          </Panel>

          <div>
            <ol className="relative">
              {timeline.map((t) => (
                <li key={t.label} className="relative flex gap-4 pb-7 last:pb-0">
                  <span className="relative flex flex-col items-center">
                    <span className="mt-2 size-2 rounded-full bg-border-strong" aria-hidden />
                    <span className="w-px flex-1 bg-border" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium">{t.label}</p>
                    <p className="text-sm text-muted-foreground">{t.note}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-2 rounded-lg border border-border bg-surface px-5 py-4">
              <Status tone="true">Still true</Status>
              <p className="mt-1 text-sm text-muted-foreground">
                Checked against the source. We&rsquo;ll write again only if that changes.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Under the window */}
      <Section>
        <div className="grid gap-12 md:grid-cols-[1fr_1fr]">
          <div>
            <Eyebrow>Under the window</Eyebrow>
            <h2 className="mt-5 text-4xl">A change isn&rsquo;t just detected — it&rsquo;s explained.</h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Reality Window combines reliable web data collection with structured reasoning, so
              every finding comes with the evidence behind it. Retrieval runs on Bright Data
              Scraper Studio; the judgement is ours.
            </p>
          </div>
          <ul className="flex flex-col justify-center gap-0 self-start border-t border-border font-mono text-sm">
            {["Web source", "Collection", "Evidence", "Reasoning", "Finding"].map((n, i) => (
              <li
                key={n}
                className="flex items-center justify-between border-b border-border py-3.5"
              >
                <span>{n}</span>
                <span className="text-muted-foreground">{i < 4 ? "↓" : "→ you"}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Close */}
      <Section>
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-lg text-4xl md:text-5xl">
            You don&rsquo;t need another tab. Tell us what you believe.
          </h2>
          <ButtonLink to="/create">Create a watch</ButtonLink>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}
