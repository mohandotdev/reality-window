import { Link } from "@tanstack/react-router";
import { Container, ButtonLink } from "./primitives";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <Container className="flex items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/brand/reality-window.svg"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain"
          />

          <span className="font-display text-xl leading-none">Reality Window</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            to="/watches"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-sm text-foreground" }}
          >
            My watches
          </Link>

          <ButtonLink to="/create" variant="quiet" className="py-2 text-sm">
            Create a watch
          </ButtonLink>
        </nav>
      </Container>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="rule-top py-10">
      <Container className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Reality Window — you don&rsquo;t need another tab.</p>
        <p>Built for people who are tired of checking.</p>
      </Container>
    </footer>
  );
}
