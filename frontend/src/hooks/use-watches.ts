import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO_MODE_CHANGE_EVENT, isDemoMode } from "@/lib/demo-mode";
import { watchService } from "@/services/watches";
import type { CreateWatchInput, Watch } from "@/types/watch";

const POLL_INTERVAL_MS = 2000;
/** Stop background refetch after this long so a stuck run never loops forever. */
const POLL_TIMEOUT_MS = 240_000;

export const watchKeys = {
  all: ["watches"] as const,
  detail: (id: string) => ["watches", id] as const,
  history: (id: string) => ["watches", id, "evaluations"] as const,
};

function shouldPollStatus(status: Watch["status"] | undefined): boolean {
  return status === "preparing" || status === "checking";
}

export function useWatchList() {
  const demo = useDemoMode();
  return useQuery({ queryKey: [...watchKeys.all, demo], queryFn: () => watchService.list() });
}

export function useWatch(id: string, pollWhilePending = false) {
  const demo = useDemoMode();
  const [startedAt] = useState(() => Date.now());

  return useQuery({
    queryKey: [...watchKeys.detail(id), demo],
    queryFn: () => watchService.get(id),
    refetchInterval: (query) => {
      const watch = query.state.data as Watch | undefined;
      if (!pollWhilePending && !shouldPollStatus(watch?.status)) return false;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) return false;
      if (pollWhilePending || shouldPollStatus(watch?.status)) return POLL_INTERVAL_MS;
      return false;
    },
  });
}

export function useWatchHistory(id: string, refreshKey?: string) {
  const queryClient = useQueryClient();
  const demo = useDemoMode();

  // Refresh history whenever the latest evaluation changes.
  useEffect(() => {
    if (refreshKey) queryClient.invalidateQueries({ queryKey: [...watchKeys.history(id), demo] });
  }, [refreshKey, id, demo, queryClient]);

  return useQuery({
    queryKey: [...watchKeys.history(id), demo],
    queryFn: () => watchService.history(id),
  });
}

export function useCreateWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWatchInput) => watchService.create(input),
    onSuccess: (watch) => {
      queryClient.setQueryData(watchKeys.detail(watch.id), watch);
      queryClient.invalidateQueries({ queryKey: watchKeys.all });
    },
  });
}

export function useRunCheck(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => watchService.runCheck(id),
    onSuccess: async (watch) => {
      queryClient.setQueryData(watchKeys.detail(id), watch);
      await queryClient.invalidateQueries({ queryKey: watchKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: watchKeys.history(id) });
      await queryClient.invalidateQueries({ queryKey: watchKeys.all });
    },
  });
}

/** Re-render helper so components can react to demo-mode toggles. */
export function useDemoMode() {
  const [demo, setDemo] = useState(isDemoMode);

  useEffect(() => {
    const handleChange = () => setDemo(isDemoMode());
    window.addEventListener(DEMO_MODE_CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(DEMO_MODE_CHANGE_EVENT, handleChange);
  }, []);

  return demo;
}
