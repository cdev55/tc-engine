import { useState } from "react";
import { JobList } from "../components/JobList";
import { JobStatus } from "../components/JobStatus";
import { UploadForm } from "../components/UploadForm";
import { UrlSubmitForm } from "../components/UrlSubmitForm";
import { useJobPolling } from "../hooks/useJobPolling";
import { useJobsList } from "../hooks/useJobsList";
import type { Job } from "../types/job";

type Tab = "url" | "upload";

export function HomePage() {
  const [tab, setTab] = useState<Tab>("url");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { jobs, loading, error, refresh } = useJobsList();

  const selectedFromList = jobs.find((j) => j.id === selectedJobId) ?? null;
  const { job, setJob, pollingError } = useJobPolling(selectedFromList);

  const handleJobCreated = (j: Job) => {
    setSelectedJobId(j.id);
    refresh();
  };

  const handleSelectJob = (j: Job) => {
    setSelectedJobId(j.id);
  };

  const handleDismissDetail = () => {
    setSelectedJobId(null);
  };

  return (
    <div className="app app-home">
      <header className="app-header">
        <h1>TC Engine</h1>
        <p className="subtitle">Video transcoding service</p>
      </header>

      <main className="app-main">
        <section className="input-section">
          <div className="tabs">
            <button
              className={`tab${tab === "url" ? " active" : ""}`}
              onClick={() => setTab("url")}
            >
              Video URL
            </button>
            <button
              className={`tab${tab === "upload" ? " active" : ""}`}
              onClick={() => setTab("upload")}
            >
              Upload file
            </button>
          </div>

          <div className="tab-content">
            {tab === "url" ? (
              <UrlSubmitForm onJobCreated={handleJobCreated} />
            ) : (
              <UploadForm onJobCreated={handleJobCreated} />
            )}
          </div>
        </section>

        <JobList
          jobs={jobs}
          loading={loading}
          error={error}
          selectedJobId={selectedJobId}
          onSelectJob={handleSelectJob}
        />

        {job && selectedJobId && (
          <section className="status-section">
            {pollingError && (
              <div className="inline-error polling-error">
                Polling error: {pollingError}
              </div>
            )}
            <JobStatus job={job} onUpdate={(updated) => setJob(updated)} />
            <button className="btn btn-ghost new-job-btn" onClick={handleDismissDetail}>
              Close details
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
