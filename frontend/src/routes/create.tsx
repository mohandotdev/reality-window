import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Container, Eyebrow, TextAreaField, TextField } from "@/components/rw/primitives";
import { SiteFooter, SiteHeader } from "@/components/rw/site-chrome";
import { DemoToggle } from "@/components/rw/watch/demo-toggle";
import { useCreateWatch } from "@/hooks/use-watches";
import { friendlyError } from "@/services/api-client";
import { watchTemplates } from "@/lib/watch-templates";

const title = "Create a watch — Reality Window";
const description =
  "Tell us what you believe. Reality Window watches the evidence and tells you when your assumption no longer holds.";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CreateWatch,
});

type WatchDraft = { subject: string; assumption: string };
type Errors = Partial<Record<keyof WatchDraft, string>>;

function validate(draft: WatchDraft): Errors {
  const errors: Errors = {};
  if (draft.subject.trim().length < 3) errors.subject = "Tell us what you're watching.";
  if (draft.assumption.trim().length < 10)
    errors.assumption = "Write the assumption you want us to keep checking.";
  return errors;
}

function CreateWatch() {
  const navigate = useNavigate();
  const createWatch = useCreateWatch();
  const [draft, setDraft] = useState<WatchDraft>({ subject: "", assumption: "" });
  const [errors, setErrors] = useState<Errors>({});

  const set = (key: keyof WatchDraft) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) return;

    const watch = await createWatch.mutateAsync({
      subject: draft.subject.trim(),
      assumption: draft.assumption.trim(),
    });
    navigate({ to: "/watches/$watchId", params: { watchId: watch.id }, search: { check: true } });
    // check=true starts the scraper workflow on the detail page — not evaluate.
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-2xl py-16 md:py-20">
        <Eyebrow>New watch</Eyebrow>
        <h1 className="mt-5 text-4xl md:text-5xl">Create a watch</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Tell us what you believe. We&rsquo;ll watch the evidence.
        </p>
        <DemoToggle className="mt-6" />

        <form onSubmit={handleSubmit} noValidate className="mt-12 space-y-10">
          <div>
            <TextField
              id="subject"
              label="What are you watching?"
              helper="Describe the subject you want to keep an eye on."
              placeholder="e.g. Houston short-term rental regulations"
              value={draft.subject}
              onChange={(e) => set("subject")(e.target.value)}
              aria-invalid={errors.subject ? true : undefined}
              aria-describedby={errors.subject ? "subject-error" : undefined}
            />
            <FieldError id="subject-error" message={errors.subject} />
          </div>
          <div>
            <TextAreaField
              id="assumption"
              label="What do you currently believe?"
              helper="Write the assumption you want us to keep checking."
              placeholder="e.g. Short-term rentals remain legal for registered hosts in Houston with a $275 annual registration fee."
              value={draft.assumption}
              onChange={(e) => set("assumption")(e.target.value)}
              aria-invalid={errors.assumption ? true : undefined}
              aria-describedby={errors.assumption ? "assumption-error" : undefined}
            />
            <FieldError id="assumption-error" message={errors.assumption} />
          </div>
          <div className="rule-top pt-8">
            <Button type="submit" disabled={createWatch.isPending}>
              {createWatch.isPending ? "Starting the watch…" : "Start watching"}
            </Button>
            {createWatch.isError && (
              <p className="mt-4 text-sm text-destructive">{friendlyError(createWatch.error)}</p>
            )}
          </div>
        </form>

        <div className="rule-top mt-16 pt-10">
          <h2 className="text-2xl">Not sure what to watch?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick one and we&rsquo;ll fill in the form.
          </p>
          <ul className="mt-6 border-t border-border">
            {watchTemplates.map((t) => (
              <li key={t.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      subject: t.subject,
                      assumption: t.assumption,
                    })
                  }
                  className="group flex w-full items-baseline justify-between gap-6 py-4 text-left transition-colors hover:text-accent"
                >
                  <span>
                    <span className="eyebrow block">{t.category}</span>
                    <span className="mt-1 block font-display text-xl">{t.question}</span>
                  </span>
                  <span className="text-sm text-muted-foreground group-hover:text-accent">Use</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <SiteFooter />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-destructive">
      {message}
    </p>
  );
}
