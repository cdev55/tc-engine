package jobs

import (
	"context"
	"transcoding-worker/internal/db"
	"transcoding-worker/internal/queue"
)

func Execute(ctx context.Context, jobID string, q *queue.RedisQueue, database *db.DB) error {
	env, err := setupWorkspace(jobID)
	if err != nil {
		return err
	}
	defer env.Cleanup()

	if err := downloadInput(ctx, env); err != nil {
		return err
	}

	if err := transcodeMP4(ctx, env, q, database); err != nil {
		return err
	}

	if err := uploadMP4(ctx, env); err != nil {
		return err
	}

	if err := packageHLS(ctx, env); err != nil {
		return err
	}

	if err := uploadHLS(ctx, env); err != nil {
		return err
	}

	return nil
}
