# Change Log

All notable changes to this extension are documented in this file.

## [1.0.1] - 2024-01-29

### Added

- Video to GIF conversion with FFmpeg
- Interactive UI (InputBox, QuickPick)
- Format support: MP4, MOV, AVI, MKV, WEBM, FLV, WMV, M4V, 3GP, OGV
- Advanced options: start time, duration, resolution, FPS, palette
- Optimization through Gifsicle (lossy/lossless compression)
- Bayer dithering for visually lossless output
- Global adaptive palette generation
- Strict TypeScript types across the codebase
- Error handling and cancelable conversions
- Progress bars with VS Code notifications
- Full configuration via settings.json

### Technical

- Modular architecture with separate classes
- Optimized memory handling (temporary file cleanup)
- Cancellation token support for clean aborts
- User input validation
