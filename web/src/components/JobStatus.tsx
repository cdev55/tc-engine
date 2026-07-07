import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cancelJob, getStreamUrl, retryJob } from "../api/client";
import type { Job } from "../types/job";
import { STATUS_LABELS } from "../types/job";
import { ProgressBar } from "./ProgressBar";

interface JobStatusProps {
  job: Job;
  onUpdate: (job: Job) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="copy-btn" onClick={copy} title="Copy">
      {copied ? "✓" : "⎘"}
    </button>
  );
}

export function JobStatus({ job, onUpdate }: JobStatusProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    if (job.status !== "COMPLETED") return;
    getStreamUrl(job.id)
      .then(({ streamUrl }) => setStreamUrl(streamUrl))
      .catch(() => setStreamUrl(null));
  }, [job.id, job.status]);

  const runAction = async (fn: () => Promise<Job>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await fn();
      onUpdate(updated);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const statusClass = `status-badge status-${job.status.toLowerCase().replace("_", "-")}`;
  const label = STATUS_LABELS[job.status] ?? job.status;

  const showCancel = job.status === "QUEUED" || job.status === "RUNNING" || job.status === "CREATED";
  const showRetry = job.status === "FAILED";
  const isIndeterminate = job.status === "CANCEL_REQUESTED" || job.status === "UPLOADING";

  return (
    <div className="job-status-card">
      <div className="job-status-header">
        <h2>Job Status</h2>
        <span className={statusClass}>{label}</span>
      </div>

      <div className="job-field">
        <span className="field-label">Job ID</span>
        <span className="field-value mono">
          {job.id.slice(0, 8)}…
          <CopyButton text={job.id} />
        </span>
      </div>

      <div className="job-field">
        <span className="field-label">Progress</span>
        <span className="field-value progress-wrap">
          <ProgressBar value={job.progress} indeterminate={isIndeterminate} />
          <span className="progress-pct">{isIndeterminate ? "…" : `${job.progress}%`}</span>
        </span>
      </div>

      <div className="job-field">
        <span className="field-label">Format</span>
        <span className="field-value">{job.outputSpec.format.toUpperCase()}</span>
      </div>

      <div className="job-field">
        <span className="field-label">Input URL</span>
        <span className="field-value url-truncate" title={job.inputUrl}>
          {job.inputUrl}
        </span>
      </div>

      {job.status === "COMPLETED" && (
        <div className="job-field">
          <span className="field-label">Stream</span>
          <span className="field-value">
            {streamUrl ? (
              <Link to={`/watch/${job.id}`} className="stream-link">
                Watch stream →
              </Link>
            ) : (
              <span className="field-muted">Resolving stream URL…</span>
            )}
          </span>
        </div>
      )}

      <div className="job-field">
        <span className="field-label">Started</span>
        <span className="field-value">{formatDate(job.createdAt)}</span>
      </div>

      <div className="job-field">
        <span className="field-label">Last updated</span>
        <span className="field-value">{formatDate(job.updatedAt)}</span>
      </div>

      {job.error && (
        <div className="job-error">
          <span>⚠ {job.error}</span>
        </div>
      )}

      {actionError && <div className="inline-error">{actionError}</div>}

      <div className="job-actions">
        {showCancel && (
          <button
            className="btn btn-outline"
            disabled={actionLoading}
            onClick={() => runAction(() => cancelJob(job.id))}
          >
            {actionLoading ? "…" : "Cancel"}
          </button>
        )}
        {showRetry && (
          <button
            className="btn btn-primary"
            disabled={actionLoading}
            onClick={() => runAction(() => retryJob(job.id))}
          >
            {actionLoading ? "…" : "Retry"}
          </button>
        )}
      </div>
    </div>
  );
}
