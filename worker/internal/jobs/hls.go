package jobs

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"bufio"
)

func packageHLS(ctx context.Context, env *ExecEnv) error {
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

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Println("Error while stdout command:::", err)
		return err
	}

	cmd.Dir = env.HLSDir

	// if err := cmd.Run(); err != nil {
	// 	return fmt.Errorf("hls ladder ffmpeg failed: %w", err)
	// }

	// 4. Start FFmpeg
	if err := cmd.Start(); err != nil {
		fmt.Println("Error while cmd start::::::::::::", err)
		return err
	}

	// 5. Parse progress
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "hls_out_time_ms=") {
			// Later: convert to % and publish to Redis
			fmt.Println("FFmpeg:", line)
		}
	}

	// 6. Wait for completion
	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("ffmpeg failed: %w", err)
	}

	// 7. Verify output exists
	if _, err := os.Stat(env.MP4Path); err != nil {
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