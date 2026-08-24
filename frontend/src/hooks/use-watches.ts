import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isDemoMode } from "@/lib/demo-mode";
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
  return useQuery({ queryKey: watchKeys.all, queryFn: () => watchService.list() });
}

export function useWatch(id: string, pollWhilePending = false) {
  const [startedAt] = useState(() => Date.now());

  return useQuery({
    queryKey: watchKeys.detail(id),
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

  // Refresh history whenever the latest evaluation changes.
  useEffect(() => {
    if (refreshKey) queryClient.invalidateQueries({ queryKey: watchKeys.history(id) });
  }, [refreshKey, id, queryClient]);

  return useQuery({
    queryKey: watchKeys.history(id),
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
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(isDemoMode()), []);
  return demo;
}
