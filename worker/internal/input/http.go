package input

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type HTTPResolver struct{}

func (r *HTTPResolver) CanHandle(url string) bool {
	return len(url) > 7 && (url[:7] == "http://" || url[:8] == "https://")
}

func (r *HTTPResolver) Download(ctx context.Context, url, dest string) error {
	
	client := &http.Client{
		Timeout: 5 * time.Minute,
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		fmt.Println("Error while creating request",req);
		return err
	}

	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error while creating response",resp);
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("http download failed: %s", resp.Status)
	}

	out, err := os.Create(dest)
	if err != nil {
		fmt.Println("Error while creating destination",err)
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	fmt.Println("Error while copying content to destination",err)
	return err
}
