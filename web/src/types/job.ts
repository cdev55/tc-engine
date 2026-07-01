export type OutputFormat = "mp4" | "mkv";

export type JobStatus =
  | "UPLOADING"
  | "CREATED"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED";

export interface Job {
  id: string;
  status: JobStatus;
  inputUrl: string;
  outputUrl: string;
  outputSpec: { format: OutputFormat };
  progress: number;
  retries: number;
  error: string | null;
  workerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const TERMINAL_STATUSES: JobStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];
export const POLLING_STATUSES: JobStatus[] = [
  "UPLOADING",
  "CREATED",
  "QUEUED",
  "RUNNING",
  "CANCEL_REQUESTED",
];

export const STATUS_LABELS: Record<JobStatus, string> = {
  UPLOADING: "Uploading",
  CREATED: "Created",
  QUEUED: "Queued",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCEL_REQUESTED: "Cancelling…",
  CANCELLED: "Cancelled",
};
