package sysproxy

type Settings struct {
	Enabled bool
	Server  string
	Bypass  string
	Raw     map[string]string
}

func Enable(host string, port int, bypass []string) (Settings, error) {
	return enable(host, port, bypass)
}
func Restore(prev Settings) error { return restore(prev) }
