import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

interface QualityLevel {
  index: number;
  label: string;
  height: number;
  bandwidth: number;
}

interface HlsPlayerProps {
  src: string;
}

function formatBandwidth(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  return `${Math.round(bps / 1000)} Kbps`;
}

export function HlsPlayer({ src }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nativeHls, setNativeHls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLevels([]);
    setSelectedLevel(-1);
    setCurrentLevel(null);
    setNativeHls(false);

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const parsed = hls.levels
          .map((level, index) => ({
            index,
            label: level.height ? `${level.height}p` : `Level ${index + 1}`,
            height: level.height,
            bandwidth: level.bitrate,
          }))
          .sort((a, b) => b.height - a.height);
        setLevels(parsed);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError("Playback failed. The stream may be unavailable.");
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      setNativeHls(true);
      return;
    }

    setError("HLS playback is not supported in this browser.");
  }, [src]);

  const handleLevelChange = (level: number) => {
    setSelectedLevel(level);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
  };

  const activeLevel =
    currentLevel !== null ? levels.find((l) => l.index === currentLevel) : null;

  return (
    <div className="hls-player">
      <div className="hls-player-video-wrap">
        <video
          ref={videoRef}
          className="hls-player-video"
          controls
          playsInline
          autoPlay
        />
      </div>

      {error && <div className="inline-error hls-player-error">{error}</div>}

      {!error && !nativeHls && levels.length > 0 && (
        <div className="hls-player-controls">
          <div className="hls-player-control-row">
            <label htmlFor="quality-select" className="hls-player-label">
              Quality
            </label>
            <select
              id="quality-select"
              className="hls-player-select"
              value={selectedLevel}
              onChange={(e) => handleLevelChange(Number(e.target.value))}
            >
              <option value={-1}>Auto (ABR)</option>
              {levels.map((level) => (
                <option key={level.index} value={level.index}>
                  {level.label} · {formatBandwidth(level.bandwidth)}
                </option>
              ))}
            </select>
          </div>

          <p className="hls-player-abr-hint">
            {selectedLevel === -1 ? (
              <>
                <span className="abr-badge">ABR</span>
                Adaptive bitrate is on — the player switches quality based on
                network conditions.
                {activeLevel && (
                  <>
                    {" "}
                    Currently playing{" "}
                    <strong>{activeLevel.label}</strong>.
                  </>
                )}
              </>
            ) : (
              <>
                Manual quality locked to{" "}
                <strong>
                  {levels.find((l) => l.index === selectedLevel)?.label}
                </strong>
                . Select Auto to re-enable adaptive streaming.
              </>
            )}
          </p>
        </div>
      )}

      {nativeHls && (
        <p className="hls-player-abr-hint field-muted">
          Playing via native HLS. Quality selection is handled by the browser.
        </p>
      )}
    </div>
  );
}
