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

	// 🔴 Guard: cancelled before start
	if ShouldCancelBeforeStart(ctx, jobID, database) {
		HandleCancellation(ctx, jobID, database)
		_ = q.ReleaseJob(context.Background(), jobID)
		return
	}

	locked, err := q.AcquireLock(ctx, jobID, workerID)
	if err != nil || !locked {
		return
	}

	log.Println("Processing job:", jobID)

	if err := database.UpdateStatus(ctx, jobID, "RUNNING", workerID); err != nil {
		_ = q.ReleaseJob(context.Background(), jobID)
		return
	}

	err = Execute(ctx, jobID, q, database)

	// ==============================
	// 🔴 CANCELLATION PATH (FIRST)
	// ==============================
	if IsCancellationError(err) {
		HandleCancellation(ctx, jobID, database)
		_ = q.ReleaseJob(context.Background(), jobID)
		return
	}

	// ==============================
	// ✅ SUCCESS PATH
	// ==============================
	if err == nil {
		_ = database.MarkCompleted(context.Background(), jobID)
		_ = q.ReleaseJob(context.Background(), jobID)
		log.Println("Completed job:", jobID)
		return
	}

	// ==============================
	// ❌ FAILURE PATH (REAL ERRORS)
	// ==============================
	retries, rerr := q.IncrementRetry(context.Background(), jobID)
	if rerr != nil {
		retries = MaxRetries
	}

	_ = database.MarkFailed(context.Background(), jobID, err.Error())
	_ = q.ReleaseJob(context.Background(), jobID)

	if retries < MaxRetries {
		_ = q.RequeueJob(context.Background(), jobID)
	} else {
		log.Println("Job moved to DEAD:", jobID)
	}
}
//curl -X POST http://localhost:3000/jobs/24b5db98-ab3c-4738-a263-db1cf71a33e9/cancel
