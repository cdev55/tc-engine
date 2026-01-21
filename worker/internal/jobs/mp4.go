package jobs

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func transcodeMP4(ctx context.Context, env *ExecEnv) error {
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

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Println("Error while stdout command:::", err)
		return err
	}
	cmd.Stderr = cmd.Stdout

	// 4. Start FFmpeg
	if err := cmd.Start(); err != nil {
		fmt.Println("Error while cmd start::::::::::::", err)
		return err
	}

	// 5. Parse progress
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "out_time_ms=") {
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

	// if err := cmd.Run(); err != nil {
	// 	return fmt.Errorf("mp4 ffmpeg failed: %w", err)
	// }

	return nil
}
