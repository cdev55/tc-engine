package jobs

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"transcoding-worker/internal/input"
	"transcoding-worker/internal/output"
)

func Execute(ctx context.Context, jobID string) error {
	workDir := filepath.Join("/tmp/transcode", jobID)
	inputPath := filepath.Join(workDir, "input.mp4")
	outputPath := filepath.Join(workDir, "output.mp4")

	// 1. Create work dir
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return err
	}
	defer os.RemoveAll(workDir)

	// 2. Download input (TEMP: dummy copy)
	// For now, assume input already exists or is local
	// Later: download from S3 / HTTP
	jobInputURL := "https://cdn-dqs.mogiio.com/dev/mogiDocs/20a01a2026a12a31a43fileexampleMP448015MG.mp4"

	resolvers := []input.Resolver{
		&input.HTTPResolver{},
	}

	s3Resolver, err := input.NewS3Resolver(ctx)
	if err == nil {
		resolvers = append(resolvers, s3Resolver)
	}

	var resolved bool
	for _, r := range resolvers {
		if r.CanHandle(jobInputURL) {
			if err := r.Download(ctx, jobInputURL, inputPath); err != nil {
				fmt.Println("Error while downloading the url", err)
				return err
			}
			resolved = true
			break
		}
	}

	if !resolved {
		return fmt.Errorf("no resolver for input: %s", jobInputURL)
	}

	// if err := os.WriteFile(inputPath, []byte{}, 0644); err != nil {
	// 	fmt.Println("Error while writing")
	// 	return err
	// }

	// 3. Build FFmpeg command
	cmd := exec.CommandContext(
		ctx,
		"ffmpeg",
		"-y",
		"-i", inputPath,
		"-c:v", "libx264",
		"-preset", "fast",
		"-crf", "23",
		"-c:a", "aac",
		"-movflags", "+faststart",
		"-progress", "pipe:1",
		outputPath,
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
	if _, err := os.Stat(outputPath); err != nil {
		return fmt.Errorf("output not created")
	}

	bucket := os.Getenv("OUTPUT_S3_BUCKET")

	if bucket == "" {
		return fmt.Errorf("OUTPUT_S3_BUCKET not set")
	}

	uploader, err := output.NewS3Uploader(ctx, bucket)
	if err != nil {
		return err
	}

	s3Key := fmt.Sprintf("outputs/%s/output.mp4", jobID)

	if err := uploader.UploadFile(ctx, outputPath, s3Key); err != nil {
		return err
	}

	return nil
}
