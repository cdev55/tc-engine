import { useEffect, useRef, useState } from "react";
import { getJob } from "../api/client";
import { type Job, TERMINAL_STATUSES } from "../types/job";

export function useJobPolling(initialJob: Job | null) {
  const [job, setJob] = useState<Job | null>(initialJob);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setJob(initialJob);
  }, [initialJob?.id]);

  useEffect(() => {
    if (!job) return;
    if (TERMINAL_STATUSES.includes(job.status)) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const poll = async () => {
      try {
        const updated = await getJob(job.id);
        setJob(updated);
        if (TERMINAL_STATUSES.includes(updated.status)) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Polling failed");
      }
    };

    intervalRef.current = setInterval(poll, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [job?.id, job?.status]);

  return { job, setJob, pollingError: error };
}
