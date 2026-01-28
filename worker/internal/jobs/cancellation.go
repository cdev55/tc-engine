package jobs

import (
	"context"
	"errors"

	"transcoding-worker/internal/db"
)

func IsCancellationError(err error) bool {
	return errors.Is(err, context.Canceled)
}

func ShouldCancelBeforeStart(
	ctx context.Context,
	jobID string,
	database *db.DB,
) bool {

	status, err := database.GetJobStatus(ctx, jobID)
	if err != nil {
		return false
	}

	return status == "CANCEL_REQUESTED" || status == "CANCELLED"
}

func HandleCancellation(
	ctx context.Context,
	jobID string,
	database *db.DB,
) {
	// use background ctx to guarantee DB write
	_ = database.MarkCancelled(context.Background(), jobID)
	log.Println("Job cancelled:", jobID)
}
