package jobs

import (
	"os"
	"path/filepath"
)

type ExecEnv struct {
	JobID     string
	WorkDir   string
	InputPath string
	MP4Path   string
	HLSDir    string
}

func setupWorkspace(jobID string) (*ExecEnv, error) {
	workDir := filepath.Join("/tmp/transcode", jobID)

	env := &ExecEnv{
		JobID:     jobID,
		WorkDir:   workDir,
		InputPath: filepath.Join(workDir, "input.mp4"),
		MP4Path:   filepath.Join(workDir, "output.mp4"),
		HLSDir:    filepath.Join(workDir, "hls"),
	}

	if err := os.MkdirAll(env.HLSDir, 0755); err != nil {
		return nil, err
	}

	return env, nil
}

func (e *ExecEnv) Cleanup() {
	_ = os.RemoveAll(e.WorkDir)
}
