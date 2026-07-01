import { useState } from "react";
import { JobStatus } from "./components/JobStatus";
import { UploadForm } from "./components/UploadForm";
import { UrlSubmitForm } from "./components/UrlSubmitForm";
import { useJobPolling } from "./hooks/useJobPolling";
import type { Job } from "./types/job";

type Tab = "url" | "upload";

export default function App() {
  const [tab, setTab] = useState<Tab>("url");
  const [submittedJob, setSubmittedJob] = useState<Job | null>(null);
  const { job, setJob, pollingError } = useJobPolling(submittedJob);

  const handleJobCreated = (j: Job) => {
    setSubmittedJob(j);
  };

  const handleReset = () => {
    setSubmittedJob(null);
    setJob(null);
  };

  return (
    <div className="app">
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

        {job && (
          <section className="status-section">
            {pollingError && (
              <div className="inline-error polling-error">
                Polling error: {pollingError}
              </div>
            )}
            <JobStatus
              job={job}
              onUpdate={(updated) => setJob(updated)}
            />
            <button className="btn btn-ghost new-job-btn" onClick={handleReset}>
              ← New job
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
