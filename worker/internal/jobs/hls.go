package jobs

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"transcoding-worker/internal/db"
	"transcoding-worker/internal/queue"
)

func packageHLS(ctx context.Context, env *ExecEnv, queue *queue.RedisQueue, database *db.DB) error {
	args := []string{
		"-y",
		"-i", env.InputPath,
		"-filter_complex", buildScaleFilter(),
	}

	// Map video + audio streams
	for i := range HLSLadder {
		args = append(args,
			"-map", fmt.Sprintf("[v%d]", i),
			"-map", "a:0",
		)
	}

	// Codec settings
	args = append(args,
		"-c:v", "libx264",
		"-preset", "fast",
		"-crf", "23",
		"-c:a", "aac",
	)

	// Bitrates
	for _, r := range HLSLadder {
		args = append(args, "-b:v", r.VideoBitrate)
	}

	// HLS flags
	args = append(args,
		"-f", "hls",
		"-hls_time", "6",
		"-hls_playlist_type", "vod",
		"-hls_segment_type", "fmp4",
		"-hls_flags", "independent_segments",
		"-var_stream_map", buildVarStreamMap(),
		"-master_pl_name", "master.m3u8",
		"-hls_segment_filename", "%v_%05d.m4s",
		"-progress", "pipe:1",
		"%v.m3u8",
	)

	durationSec, err := getDurationSeconds(ctx, env.InputPath)
	if err != nil || durationSec <= 0 {
		return err
	}

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)

	// stdout, err := cmd.StdoutPipe()
	// if err != nil {
	// 	fmt.Println("Error while stdout command:::", err)
	// 	return err
	// }
	
	cmd.Dir = env.HLSDir

	// if err := cmd.Run(); err != nil {
	// 	return fmt.Errorf("hls ladder ffmpeg failed: %w", err)
	// }

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Println("Error while stdout command:::", err)
		return err
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		fmt.Println("Error while cmd start::::::::::::", err)
		return err
	}

	scanner := bufio.NewScanner(stdout)
	lastSaved := 60.0 // start of HLS phase

	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "out_time_ms=") {
			msStr := strings.TrimPrefix(line, "out_time_ms=")
			fmt.Println("FFmpeg HLS:", line)

			ms, _ := strconv.ParseFloat(msStr, 64)

			currentSec := ms / 1_000_000
			rawPercent := (currentSec / durationSec) * 100
			if rawPercent > 100 {
				rawPercent = 100
			}
			if rawPercent < 0 {
				rawPercent = 0
			}

			// Map 0–100
			mapped := rawPercent

			if mapped > 100 {
				mapped = 100
			}

			// Redis: every update
			_ = queue.PublishProgress(ctx, env.JobID, mapped)

			// DB: every 1%
			if mapped-lastSaved >= 10 {
				lastSaved = mapped
				_ = database.UpdateProgress(ctx, env.JobID, mapped)
			}
		}
	}

	if err := cmd.Wait(); err != nil {
		if IsCancellationError(ctx.Err()) {
			return ctx.Err()
		}
		return fmt.Errorf("hls ffmpeg failed: %w", err)
	}

	// 7. Verify output exists
	if _, err := os.Stat(env.HLSDir); err != nil {
		return fmt.Errorf("output not created")
	}

	return writeMasterPlaylist(env.HLSDir)
}

func buildScaleFilter() string {
	parts := []string{}
	for i, r := range HLSLadder {
		parts = append(parts,
			fmt.Sprintf("[0:v]scale=w=%d:h=%d[v%d]", r.Width, r.Height, i),
		)
	}
	return strings.Join(parts, ";")
}

func buildVarStreamMap() string {
	parts := []string{}
	for i, r := range HLSLadder {
		parts = append(parts,
			fmt.Sprintf("v:%d,a:%d,name:%s", i, i, r.Name),
		)
	}
	return strings.Join(parts, " ")
}

func writeMasterPlaylist(hlsDir string) error {
	var b strings.Builder

	b.WriteString("#EXTM3U\n#EXT-X-VERSION:7\n")

	for _, r := range HLSLadder {
		b.WriteString(fmt.Sprintf(
			"#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d\n%s.m3u8\n",
			r.Bandwidth,
			r.Width,
			r.Height,
			r.Name,
		))
	}

	return os.WriteFile(
		filepath.Join(hlsDir, "master.m3u8"),
		[]byte(b.String()),
		0644,
	)
}

// func packageHLS(ctx context.Context, env *ExecEnv) error {
// 	playlist := filepath.Join(env.HLSDir, "720p.m3u8")

// 	cmd := exec.CommandContext(
// 		ctx,
// 		"ffmpeg",
// 		"-y",
// 		"-i", env.InputPath,
// 		"-c:v", "libx264",
// 		"-preset", "fast",
// 		"-crf", "23",
// 		"-c:a", "aac",
// 		"-f", "hls",
// 		"-hls_time", "6",
// 		"-hls_playlist_type", "vod",
// 		"-hls_segment_type", "fmp4",
// 		"-hls_fmp4_init_filename", "init.mp4",
// 		"-hls_segment_filename", "segment_%05d.m4s",
// 		playlist,
// 	)

// 	cmd.Dir = env.HLSDir

// 	if err := cmd.Run(); err != nil {
// 		return fmt.Errorf("hls ffmpeg failed: %w", err)
// 	}

// 	return writeMasterPlaylist(env.HLSDir)
// }

// func writeMasterPlaylist(hlsDir string) error {
// 	master := `#EXTM3U
// #EXT-X-VERSION:7
// #EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
// 720p.m3u8
// `
// 	return os.WriteFile(
// 		filepath.Join(hlsDir, "master.m3u8"),
// 		[]byte(master),
// 		0644,
// 	)
// }
