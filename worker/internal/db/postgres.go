package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func Connect(ctx context.Context, url string) (*DB, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	return &DB{Pool: pool}, nil
}

func (d *DB) UpdateStatus(
	ctx context.Context,
	jobID, status, workerID string,
) error {
	_, err := d.Pool.Exec(ctx, `
		UPDATE "Job"
		SET status=$1, "workerId"=$2, "updatedAt"=now()
		WHERE id=$3 AND status IN ('QUEUED','FAILED')
	`, status, workerID, jobID)

	return err
}

func (d *DB) MarkCompleted(ctx context.Context, jobID string) error {
	_, err := d.Pool.Exec(ctx, `
		UPDATE "Job"
		SET status='COMPLETED', progress=100, "updatedAt"=now()
		WHERE id=$1
	`, jobID)
	return err
}

func (d *DB) MarkFailed(ctx context.Context, jobID, errMsg string) error {
	_, err := d.Pool.Exec(ctx, `
		UPDATE "Job"
		SET status='FAILED', error=$2, "updatedAt"=now()
		WHERE id=$1
	`, jobID, errMsg)
	return err
}
