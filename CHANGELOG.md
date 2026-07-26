# Change Log

All notable changes to this extension are documented in this file.

## [1.0.3] - 2026-07-26

### Fixed

- Fixed CI/build failure during `npm run bundle` caused by optional AWS import resolution in `unzipper`.
- Updated esbuild externals to prevent bundling from failing when AWS SDK is not used by the extension runtime.

### Security

- Resolved npm audit vulnerabilities in transitive dependencies.
- Upgraded `unzipper` to `^0.12.5` to remove legacy vulnerable dependency chains.
- Added dependency overrides for patched versions of:
	- `brace-expansion`
	- `diff`
	- `serialize-javascript`

### Technical

- Dependency graph and lockfile refreshed after security updates.
- Build, unit tests, lint, and audit validations pass with the new dependency set.

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
