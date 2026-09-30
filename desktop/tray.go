//go:build !darwin

package main

import (
	"bytes"
	"encoding/binary"
	"github.com/energye/systray"
	"image"
	"image/color"
	"image/png"
	"runtime"
)

func startTray(show, record, proxy, quit func()) func() {
	start, end := systray.RunWithExternalLoop(func() {
		systray.SetIcon(trayIcon())
		systray.SetTooltip("Charstle")
		systray.SetOnClick(func(systray.IMenu) { show() })
		systray.AddMenuItem("Open Charstle", "").Click(show)
		systray.AddMenuItem("Toggle recording", "").Click(record)
		systray.AddMenuItem("Toggle system proxy", "").Click(proxy)
		systray.AddSeparator()
		systray.AddMenuItem("Quit", "").Click(quit)
	}, func() {})
	start()
	return end
}
func trayIcon() []byte {
	img := image.NewNRGBA(image.Rect(0, 0, 32, 32))
	for y := 0; y < 32; y++ {
		for x := 0; x < 32; x++ {
			img.Set(x, y, color.NRGBA{25, 24, 45, 255})
		}
	}
	letters := []string{"01110", "11001", "11000", "11000", "11000", "11001", "01110"}
	for y, row := range letters {
		for x, c := range row {
			if c == '1' {
				for dy := 0; dy < 3; dy++ {
					for dx := 0; dx < 3; dx++ {
						img.Set(8+x*3+dx, 5+y*3+dy, color.NRGBA{163, 137, 255, 255})
					}
				}
			}
		}
	}
	var out bytes.Buffer
	png.Encode(&out, img)
	if runtime.GOOS != "windows" {
		return out.Bytes()
	}
	header := make([]byte, 22)
	binary.LittleEndian.PutUint16(header[2:], 1)
	binary.LittleEndian.PutUint16(header[4:], 1)
	header[6] = 32
	header[7] = 32
	binary.LittleEndian.PutUint16(header[10:], 1)
	binary.LittleEndian.PutUint16(header[12:], 32)
	binary.LittleEndian.PutUint32(header[14:], uint32(out.Len()))
	binary.LittleEndian.PutUint32(header[18:], 22)
	return append(header, out.Bytes()...)
}
