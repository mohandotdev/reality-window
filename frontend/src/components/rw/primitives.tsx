import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/* ---------- Layout ---------- */

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-5xl px-6 md:px-10", className)}>{children}</div>;
}

export function Section({
  children,
  className,
  bordered = true,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <section className={cn("py-20 md:py-28", bordered && "rule-top", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

/* ---------- Button ---------- */

type Variant = "primary" | "quiet" | "link";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground border border-accent hover:bg-foreground hover:border-foreground",
  quiet:
    "bg-transparent text-foreground border border-border-strong hover:bg-secondary",
  link: "border border-transparent text-foreground underline underline-offset-4 decoration-border-strong hover:decoration-accent px-0",
};

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={cn(baseClass, variantClass[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  to,
  hash,
  children,
}: {
  variant?: Variant;
  className?: string;
  to: string;
  hash?: string | undefined;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      {...(hash ? { hash } : {})}
      className={cn(baseClass, variantClass[variant], className)}
    >
      {children}
    </Link>
  );
}

/* ---------- Form fields ---------- */

function FieldShell({
  label,
  helper,
  optional,
  htmlFor,
  children,
}: {
  label: string;
  helper?: string | undefined;
  optional?: boolean | undefined;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={htmlFor} className="font-display text-2xl">
          {label}
        </label>
        {optional && <span className="eyebrow">Optional</span>}
      </div>
      {helper && <p className="text-sm text-muted-foreground">{helper}</p>}
      {children}
    </div>
  );
}

const controlClass =
  "w-full rounded-md border border-input bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function TextField({
  label,
  helper,
  optional,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string | undefined; optional?: boolean | undefined; id: string }) {
  return (
    <FieldShell label={label} helper={helper} optional={optional} htmlFor={id}>
      <input id={id} className={cn(controlClass, className)} {...props} />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  helper,
  optional,
  className,
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helper?: string | undefined;
  optional?: boolean | undefined;
  id: string;
}) {
  return (
    <FieldShell label={label} helper={helper} optional={optional} htmlFor={id}>
      <textarea id={id} className={cn(controlClass, "min-h-32 resize-y leading-relaxed", className)} {...props} />
    </FieldShell>
  );
}

/* ---------- Status ---------- */

export function Status({
  tone = "true",
  children,
}: {
  tone?: "true" | "changed" | "neutral";
  children: ReactNode;
}) {
  const dot =
    tone === "true" ? "bg-still-true" : tone === "changed" ? "bg-accent" : "bg-border-strong";
  const text =
    tone === "true" ? "text-still-true" : tone === "changed" ? "text-accent" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", text)}>
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      {children}
    </span>
  );
}

/* ---------- Card ---------- */

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-6 md:p-8", className)}>
      {children}
    </div>
  );
}
