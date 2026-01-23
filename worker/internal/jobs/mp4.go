package jobs

import (
	"bufio"
	"context"
	"os/exec"
	"strconv"
	"strings"
	"transcoding-worker/internal/db"
	"transcoding-worker/internal/queue"
)

func transcodeMP4(
	ctx context.Context,
	env *ExecEnv,
	queue *queue.RedisQueue,
	db *db.DB,
) error {

	durationSec, err := getDurationSeconds(ctx, env.InputPath)
	if err != nil || durationSec <= 0 {
		return err
	}

	cmd := exec.CommandContext(
		ctx,
		"ffmpeg",
		"-y",
		"-i", env.InputPath,
		"-c:v", "libx264",
		"-preset", "fast",
		"-crf", "23",
		"-c:a", "aac",
		"-movflags", "+faststart",
		"-progress", "pipe:1",
		env.MP4Path,
	)

	stdout, _ := cmd.StdoutPipe()
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		return err
	}

	scanner := bufio.NewScanner(stdout)
	lastSaved := 0.0

	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "out_time_ms=") {
			msStr := strings.TrimPrefix(line, "out_time_ms=")
			ms, _ := strconv.ParseFloat(msStr, 64)

			currentSec := ms / 1_000_000
			percent := (currentSec / durationSec) * 100
			if percent > 100 {
				percent = 100
			}

			// 🔴 Redis: every update
			_ = queue.PublishProgress(ctx, env.JobID, percent)

			// 🟡 DB: every 10%
			if percent-lastSaved >= 10 {
				lastSaved = percent
				_ = db.UpdateProgress(ctx, env.JobID, percent)
			}
		}
	}

	if err := cmd.Wait(); err != nil {
		return err
	}

	// Final state
	_ = queue.PublishProgress(ctx, env.JobID, 100)
	_ = db.UpdateProgress(ctx, env.JobID, 100)

	return nil
}

// func transcodeMP4(ctx context.Context, env *ExecEnv) error {
// 	cmd := exec.CommandContext(
// 		ctx,
// 		"ffmpeg",
// 		"-y",
// 		"-i", env.InputPath,
// 		"-c:v", "libx264",
// 		"-preset", "fast",
// 		"-crf", "23",
// 		"-c:a", "aac",
// 		"-movflags", "+faststart",
// 		"-progress", "pipe:1",
// 		env.MP4Path,
// 	)

// 	stdout, err := cmd.StdoutPipe()
// 	if err != nil {
// 		fmt.Println("Error while stdout command:::", err)
// 		return err
// 	}
// 	cmd.Stderr = cmd.Stdout

// 	// 4. Start FFmpeg
// 	if err := cmd.Start(); err != nil {
// 		fmt.Println("Error while cmd start::::::::::::", err)
// 		return err
// 	}

// 	// 5. Parse progress
// 	scanner := bufio.NewScanner(stdout)
// 	for scanner.Scan() {
// 		line := scanner.Text()
// 		if strings.HasPrefix(line, "out_time_ms=") {
// 			// Later: convert to % and publish to Redis
// 			fmt.Println("FFmpeg:", line)
// 		}
// 	}

// 	// 6. Wait for completion
// 	if err := cmd.Wait(); err != nil {
// 		return fmt.Errorf("ffmpeg failed: %w", err)
// 	}

// 	// 7. Verify output exists
// 	if _, err := os.Stat(env.MP4Path); err != nil {
// 		return fmt.Errorf("output not created")
// 	}

// 	// if err := cmd.Run(); err != nil {
// 	// 	return fmt.Errorf("mp4 ffmpeg failed: %w", err)
// 	// }

// 	return nil
// }
