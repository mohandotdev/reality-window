import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { hasConfiguredBackend, isDemoMode, setDemoMode } from "@/lib/demo-mode";
import { cn } from "@/lib/utils";

/**
 * Small, honest indicator: says which data the screen is showing and lets a
 * presenter switch. Demo data is never presented as a live result.
 */
export function DemoToggle({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const [demo, setDemo] = useState<boolean | null>(null);

  useEffect(() => setDemo(isDemoMode()), []);

  if (demo === null) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-sm", className)}>
      <span className="eyebrow">{demo ? "Demo data" : "Live data"}</span>
      <button
        type="button"
        onClick={() => {
          const next = !demo;
          setDemoMode(next);
          setDemo(next);
          queryClient.removeQueries({ queryKey: ["watches"] });
        }}
        className="text-sm text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
      >
        {demo ? "Use live backend" : "Use demo data"}
      </button>
      {!hasConfiguredBackend && demo && (
        <span className="text-xs text-muted-foreground">
          No backend URL configured — set VITE_RW_API_BASE_URL for live data.
        </span>
      )}
    </div>
  );
}
