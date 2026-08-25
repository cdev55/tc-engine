import { useState } from "react";
import { Link } from "react-router-dom";
import type { Job } from "../types/job";
import { STATUS_LABELS } from "../types/job";
import { ProgressBar } from "./ProgressBar";

interface JobListProps {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  selectedJobId: string | null;
  onSelectJob: (job: Job) => void;
  onDeleteJob: (job: Job) => Promise<void>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function truncate(str: string, max = 40) {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…`;
}

const NON_DELETABLE_STATUSES = new Set(["RUNNING", "CANCELLED_REQUESTED"]);

export function JobList({
  jobs,
  loading,
  error,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
}: JobListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (job: Job) => {
    const confirmed = window.confirm(
      `Delete job ${job.id.slice(0, 8)}…?\n\nThis permanently removes the job and all associated files from storage.`
    );
    if (!confirmed) return;

    setDeletingId(job.id);
    setDeleteError(null);
    try {
      await onDeleteJob(job);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete job");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="jobs-section">
      <div className="jobs-section-header">
        <h2>All jobs</h2>
        <span className="jobs-count">
          {loading && jobs.length === 0 ? "…" : `${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {error && <div className="inline-error">{error}</div>}
      {deleteError && <div className="inline-error">{deleteError}</div>}

      {loading && jobs.length === 0 ? (
        <div className="jobs-empty">
          <span className="spinner" />
          <span>Loading jobs…</span>
        </div>
      ) : jobs.length === 0 ? (
        <p className="jobs-empty field-muted">No jobs yet. Submit a video to get started.</p>
      ) : (
        <div className="jobs-table-wrap">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Format</th>
                <th>Input</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const statusClass = `status-badge status-${job.status.toLowerCase().replace("_", "-")}`;
                const label = STATUS_LABELS[job.status] ?? job.status;
                const isIndeterminate =
                  job.status === "CANCEL_REQUESTED" || job.status === "UPLOADING";
                const isSelected = job.id === selectedJobId;
                const isDeleting = deletingId === job.id;
                const canDelete = !NON_DELETABLE_STATUSES.has(job.status);

                return (
                  <tr
                    key={job.id}
                    className={isSelected ? "selected" : undefined}
                    onClick={() => onSelectJob(job)}
                  >
                    <td className="mono" title={job.id}>
                      {job.id.slice(0, 8)}…
                    </td>
                    <td>
                      <span className={statusClass}>{label}</span>
                    </td>
                    <td className="jobs-progress-cell">
                      <ProgressBar
                        value={job.progress}
                        indeterminate={isIndeterminate}
                      />
                      <span className="progress-pct">
                        {isIndeterminate ? "…" : `${job.progress}%`}
                      </span>
                    </td>
                    <td>{job.outputSpec.format.toUpperCase()}</td>
                    <td className="jobs-input-cell" title={job.inputUrl || "—"}>
                      {job.inputUrl ? truncate(job.inputUrl) : "—"}
                    </td>
                    <td className="jobs-date-cell">{formatDate(job.createdAt)}</td>
                    <td className="jobs-actions-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="jobs-actions">
                        {job.status === "COMPLETED" ? (
                          <Link to={`/watch/${job.id}`} className="stream-link">
                            Watch
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => onSelectJob(job)}
                          >
                            Details
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-delete"
                          disabled={!canDelete || isDeleting}
                          title={
                            canDelete
                              ? "Delete job and storage"
                              : "Cancel the job before deleting"
                          }
                          onClick={() => handleDelete(job)}
                        >
                          {isDeleting ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
