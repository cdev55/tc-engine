import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getStreamUrl } from "../api/client";
import { HlsPlayer } from "../components/HlsPlayer";

export function PlayerPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setError("Missing job ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setStreamUrl(null);

    getStreamUrl(jobId)
      .then(({ streamUrl }) => setStreamUrl(streamUrl))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load stream")
      )
      .finally(() => setLoading(false));
  }, [jobId]);

  return (
    <div className="app player-page">
      <header className="player-header">
        <Link to="/" className="btn btn-ghost player-back">
          ← Back
        </Link>
        <div className="player-header-text">
          <h1>Stream Player</h1>
          {jobId && (
            <p className="subtitle player-job-id">
              Job {jobId.slice(0, 8)}…
            </p>
          )}
        </div>
      </header>

      <main className="player-main">
        {loading && (
          <div className="player-state">
            <span className="spinner" />
            <span>Loading stream…</span>
          </div>
        )}

        {error && (
          <div className="player-state">
            <div className="inline-error">{error}</div>
            <p className="field-muted">
              The stream is only available after transcoding completes.
            </p>
          </div>
        )}

        {!loading && !error && streamUrl && <HlsPlayer src={streamUrl} />}
      </main>
    </div>
  );
}
