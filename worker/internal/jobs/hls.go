package jobs

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func packageHLS(ctx context.Context, env *ExecEnv) error {
	playlist := filepath.Join(env.HLSDir, "720p.m3u8")

	cmd := exec.CommandContext(
		ctx,
		"ffmpeg",
		"-y",
		"-i", env.InputPath,
		"-c:v", "libx264",
		"-preset", "fast",
		"-crf", "23",
		"-c:a", "aac",
		"-f", "hls",
		"-hls_time", "6",
		"-hls_playlist_type", "vod",
		"-hls_segment_type", "fmp4",
		"-hls_fmp4_init_filename", "init.mp4",
		"-hls_segment_filename", "segment_%05d.m4s",
		playlist,
	)

	cmd.Dir = env.HLSDir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("hls ffmpeg failed: %w", err)
	}

	return writeMasterPlaylist(env.HLSDir)
}

func writeMasterPlaylist(hlsDir string) error {
	master := `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
720p.m3u8
`
	return os.WriteFile(
		filepath.Join(hlsDir, "master.m3u8"),
		[]byte(master),
		0644,
	)
}
