package main

// Wails v2 and systray have conflicting Objective-C delegates on macOS.
// The native application menu provides the same controls on this platform.
func startTray(show, record, proxy, quit func()) func() { return func() {} }
