import { useRef, useState } from "react";
import { addJobToQueue, getPresignedUploadUrl, uploadFileToS3 } from "../api/client";
import type { Job, OutputFormat } from "../types/job";

interface UploadFormProps {
  onJobCreated: (job: Job) => void;
}

type Step = "idle" | "presign" | "upload" | "queue" | "done";

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  presign: "Requesting upload URL…",
  upload: "Uploading to storage…",
  queue: "Starting transcode…",
  done: "Done",
};

export function UploadForm({ onJobCreated }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<OutputFormat>("mp4");
  const [step, setStep] = useState<Step>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loading = step !== "idle" && step !== "done";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setUploadPct(0);

    try {
      setStep("presign");
      const { jobId, uploadUrl } = await getPresignedUploadUrl(
        file.name,
        file.type || "video/mp4"
      );

      setStep("upload");
      await uploadFileToS3(uploadUrl, file, setUploadPct);

      setStep("queue");
      const job = await addJobToQueue(jobId, format);

      setStep("done");
      onJobCreated(job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("idle");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <form className="submit-form" onSubmit={submit}>
      <div
        className={`dropzone${file ? " has-file" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
        />
        {file ? (
          <div className="file-info">
            <span className="file-name">{file.name}</span>
            <span className="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            <button
              type="button"
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="dropzone-hint">
            <span className="dropzone-icon">▶ or 📄</span>
            <p>Drag &amp; drop a video here or click to browse</p>
            <p className="dropzone-types">MP4, MOV, MKV, WebM</p>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="upload-format">Output format</label>
        <select
          id="upload-format"
          value={format}
          onChange={(e) => setFormat(e.target.value as OutputFormat)}
          disabled={loading}
        >
          <option value="mp4">MP4</option>
          <option value="mkv">MKV</option>
        </select>
      </div>

      {loading && (
        <div className="upload-steps">
          <div className="upload-step-label">{STEP_LABELS[step]}</div>
          {step === "upload" && (
            <div className="progress-bar-track" style={{ marginTop: "6px" }}>
              <div className="progress-bar-fill" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
          {step !== "upload" && (
            <div className="progress-bar-track" style={{ marginTop: "6px" }}>
              <div className="progress-bar-fill indeterminate" />
            </div>
          )}
        </div>
      )}

      {error && <div className="inline-error">{error}</div>}

      <button
        className="btn btn-primary"
        type="submit"
        disabled={loading || !file}
      >
        {loading ? <span className="spinner" /> : "Start transcode"}
      </button>
    </form>
  );
}
