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
	if err != nil {
		log.Printf("Failed to acquire lock for job %s: %v", jobID, err)
		return
	}
	if !locked {
		return
	}

	log.Println("Processing job:", jobID)

	if err := database.UpdateStatus(ctx, jobID, "RUNNING", workerID); err != nil {
		log.Printf("Failed to update status to RUNNING for job %s: %v", jobID, err)
		q.ReleaseJob(ctx, jobID)
		return
	}

	err = Execute(ctx, jobID)

	if err == nil {
		if err := database.MarkCompleted(ctx, jobID); err != nil {
			log.Printf("Failed to mark job %s as completed: %v", jobID, err)
		}
		if err := q.ReleaseJob(ctx, jobID); err != nil {
			log.Printf("Failed to release job %s: %v", jobID, err)
		}
		log.Println("Completed job:", jobID)
		return
	}

	// Failure path
	retries, err := q.IncrementRetry(ctx, jobID)
	if err != nil {
		log.Printf("Failed to increment retry count for job %s: %v", jobID, err)
		retries = MaxRetries // Assume max retries to prevent infinite retries
	}

	if err := database.MarkFailed(ctx, jobID, err.Error()); err != nil {
		log.Printf("Failed to mark job %s as failed: %v", jobID, err)
	}

	if err := q.ReleaseJob(ctx, jobID); err != nil {
		log.Printf("Failed to release job %s: %v", jobID, err)
	}

	if retries < MaxRetries {
		if err := q.RequeueJob(ctx, jobID); err != nil {
			log.Printf("Failed to requeue job %s: %v", jobID, err)
		}
	} else {
		log.Println("Job moved to DEAD:", jobID)
	}
}
