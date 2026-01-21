package jobs

import "context"

func Execute(ctx context.Context, jobID string) error {
	env, err := setupWorkspace(jobID)
	if err != nil {
		return err
	}
	defer env.Cleanup()

	if err := downloadInput(ctx, env); err != nil {
		return err
	}

	if err := transcodeMP4(ctx, env); err != nil {
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
