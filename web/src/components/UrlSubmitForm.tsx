import { useState } from "react";
import { createJobFromUrl } from "../api/client";
import type { Job, OutputFormat } from "../types/job";

interface UrlSubmitFormProps {
  onJobCreated: (job: Job) => void;
}

export function UrlSubmitForm({ onJobCreated }: UrlSubmitFormProps) {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<OutputFormat>("mp4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (s: string) => {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl(url)) {
      setError("Please enter a valid http(s) URL.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const job = await createJobFromUrl(url, format);
      onJobCreated(job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="submit-form" onSubmit={submit}>
      <div className="form-group">
        <label htmlFor="video-url">Video URL</label>
        <input
          id="video-url"
          type="text"
          placeholder="https://example.com/video.mp4"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="url-format">Output format</label>
        <select
          id="url-format"
          value={format}
          onChange={(e) => setFormat(e.target.value as OutputFormat)}
          disabled={loading}
        >
          <option value="mp4">MP4</option>
          <option value="mkv">MKV</option>
        </select>
      </div>

      {error && <div className="inline-error">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading || !url.trim()}>
        {loading ? <span className="spinner" /> : "Start transcode"}
      </button>
    </form>
  );
}
