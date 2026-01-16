package jobs

import (
	"context"
	"log"

	"transcoding-worker/internal/db"
	"transcoding-worker/internal/queue"
)

const MaxRetries = 3

func ProcessJob(
	ctx context.Context,
	jobID string,
	workerID string,
	q *queue.RedisQueue,
	database *db.DB,
) {

	locked, err := q.AcquireLock(ctx, jobID, workerID)
	if err != nil || !locked {
		return
	}

	log.Println("Processing job:", jobID)

	if err := database.UpdateStatus(ctx, jobID, "RUNNING", workerID); err != nil {
		return
	}

	err = Execute(ctx, jobID)

	if err == nil {
		database.MarkCompleted(ctx, jobID)
		q.ReleaseJob(ctx, jobID)
		log.Println("Completed job:", jobID)
		return
	}

	// Failure path
	retries, _ := q.IncrementRetry(ctx, jobID)
	database.MarkFailed(ctx, jobID, err.Error())
	q.ReleaseJob(ctx, jobID)

	if retries < MaxRetries {
		q.RequeueJob(ctx, jobID)
	}else{
		log.Println("Job moved to DEAD:", jobID)
	}
}
