import { useCallback, useEffect, useRef, useState } from "react";
import { listJobs } from "../api/client";
import { type Job, TERMINAL_STATUSES } from "../types/job";

export function useJobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listJobs();
      setJobs(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const hasActive = jobs.some((j) => !TERMINAL_STATUSES.includes(j.status));

    if (!hasActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(refresh, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobs, refresh]);

  return { jobs, loading, error, refresh };
}
