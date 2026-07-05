package jobs

import (
	"context"
	"fmt"
	"transcoding-worker/internal/db"
	"transcoding-worker/internal/input"
)

func downloadInput(ctx context.Context, env *ExecEnv, database *db.DB) error {
	inputURL, err := database.GetJobInputURL(ctx, env.JobID)
	if err != nil {
		return fmt.Errorf("failed to fetch input URL for job %s: %w", env.JobID, err)
	}
	if inputURL == "" {
		return fmt.Errorf("job %s has no input URL", env.JobID)
	}

	resolvers := []input.Resolver{
		&input.HTTPResolver{},
	}

	s3r, err := input.NewS3Resolver(ctx)
	if err == nil {
		resolvers = append(resolvers, s3r)
	}

	for _, r := range resolvers {
		if r.CanHandle(inputURL) {
			return r.Download(ctx, inputURL, env.InputPath)
		}
	}

	return fmt.Errorf("no resolver for input: %s", inputURL)
}
