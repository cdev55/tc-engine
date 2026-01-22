package jobs

type Rendition struct {
	Name       string
	Width      int
	Height     int
	VideoBitrate string
	Bandwidth  int
}

var HLSLadder = []Rendition{
	{
		Name: "1080p",
		Width: 1920,
		Height: 1080,
		VideoBitrate: "5000k",
		Bandwidth: 5000000,
	},
	{
		Name: "720p",
		Width: 1280,
		Height: 720,
		VideoBitrate: "3000k",
		Bandwidth: 3000000,
	},
	{
		Name: "480p",
		Width: 854,
		Height: 480,
		VideoBitrate: "1500k",
		Bandwidth: 1500000,
	},
}
