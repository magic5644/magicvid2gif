# Magic Vid2Gif 🎩✨

<div align="center">
  <img src="medias/logo.png" alt="Magic Vid2Gif Logo" width="400"/>
</div>

VS Code extension for VS Code-compatible editors, including VSCodium/Open VSX installs, that converts videos to optimized GIFs. It aims for high visual quality with minimal file size and no manual FFmpeg setup on supported platforms.

[![Version](https://img.shields.io/visual-studio-marketplace/v/magic5644.magicvid2gif?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=magic5644.magicvid2gif)
[![Open VSX Version](https://img.shields.io/open-vsx/v/magic5644/magicvid2gif?label=Open%20VSX&logo=eclipse&logoColor=white)](https://open-vsx.org/extension/magic5644/magicvid2gif)
[![License](https://img.shields.io/github/license/magic5644/magicvid2gif)](https://github.com/magic5644/magicvid2gif/blob/main/LICENSE)
[![Github stars](https://img.shields.io/github/stars/magic5644/magicvid2gif?style=flat&color=gold&logo=github)](https://github.com/magic5644/magicvid2gif)
[![vscode downloads](https://img.shields.io/visual-studio-marketplace/d/magic5644.magicvid2gif?label=vscode%20Marketplace%20Downloads)](https://marketplace.visualstudio.com/items?itemName=magic5644.magicvid2gif)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/magic5644/magicvid2gif?label=Open%20VSX%20Downloads)](https://open-vsx.org/extension/magic5644/magicvid2gif)

## Features

<div align="center">
  <img src="medias/demo.gif" alt="demo of Magic Vid2Gif in action" width="800"/>
</div>

- Fast default conversion and an advanced options flow (start time, duration, resolution, FPS, palette).
- High-quality pipeline: Lanczos scaling, global palette generation, ordered dithering.
- Optional Gifsicle post-optimization (lossy/lossless).
- Strict TypeScript types, modular architecture, progress notifications, and cancelable runs.
- Existing GIF outputs are preserved. If `clip_magic.gif` exists, the next output becomes `clip_magic_1.gif`.

## Requirements

- VS Code 1.96.0 or newer, or a compatible editor that supports Open VSX extensions.
- Node.js 20.19+ for development and CI.
- FFmpeg and FFprobe are auto-downloaded by the extension if missing on:
  - Windows x64 / arm64
  - Linux x64 / arm64
  - macOS Intel / Apple Silicon
- Downloaded binaries are verified with SHA-256 before use. If verification fails, installation stops.
- On Linux, `.tar.xz` extraction uses the system `tar`.
- Optional: Gifsicle for extra optimization

## Usage

1. Right-click a video (`.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, etc.) in the Explorer.
2. Choose **“Convert to GIF (Quick)”** for defaults or **“Convert to GIF (Advanced Options)”** to tweak settings.
3. Watch progress in the notification area; the resulting GIF is saved next to the source file.

## Configuration (settings.json)

```json
{
  "magicvid2gif.defaultResolution": "1920:1080",
  "magicvid2gif.defaultFps": 30,
  "magicvid2gif.colorCount": 128,
  "magicvid2gif.optimizationLevel": "ultra",
  "magicvid2gif.dithering": true,
  "magicvid2gif.lossyCompression": 80,
  "magicvid2gif.gifsiclePath": "",
  "magicvid2gif.autoInstallFfmpeg": true
}
```

Set `magicvid2gif.defaultFps` to `0` to keep the source FPS. Resolutions can be `original`, `width:height`, `-1:height`, or `width:-1`.

## Scripts

- `npm run build:esbuild` - bundle to `dist/extension.js`
- `npm run compile` - TypeScript to `out/`
- `npm run lint` - ESLint checks
- `npm run test:unit` - unit tests
- `npm run test:e2e` - VS Code integration tests against latest stable VS Code
- `npm run test:vscode:minimum` - VS Code integration tests against the minimum supported VS Code version
- `npm run package:vsix` - build a VSIX with the local `vsce` dev dependency
- `npm run package:verify` - verify VSIX contents

## Project structure

```bash
src/
├─ extension.ts          // Entry point, commands, UI flow
├─ videoConverter.ts     // FFmpeg pipeline
├─ conversionOptions.ts  // Validation and output path helpers
├─ optimizationService.ts// Gifsicle optimizations
└─ types.ts              // Shared interfaces
```

## Packaging

```bash
npm run package:vsix
npm run package:verify
```

The VSIX intentionally excludes generated/local artifacts such as `wiki/`, `.graph-it/`, `.vscode/`, source files, tests, maps, and package lock data. `medias/demo.gif` stays packaged because it renders in README/marketplace views.

For Open VSX/VSCodium-compatible publishing, use the same verified VSIX:

```bash
npm run publish:open-vsx -- -p <OVSX_PAT> --packagePath magicvid2gif-<version>.vsix
```

## VSIX-based E2E tests

You can run E2E tests against a built VSIX using the `test:vscode:vsix` helper which packages the extension and runs the test suite inside a temporary VS Code instance:

```bash
npm run test:vscode:vsix
```

Notes and tips:

- The script uses the local `vsce` dev dependency to build a `.vsix`.
- You can pass an existing VSIX with `node ./out/test/vscode-e2e/runTests.js --vsix ./magicvid2gif-1.0.0.vsix`.
- You can target a specific VS Code version with `--vscode-version 1.96.0` or `--vscode-version stable`.
- Make sure to run `npm run compile` (or `npm run compile:tests`) before invoking this script so the test runner is compiled into `out/test/suite`.

## Support policy

The extension keeps VS Code 1.96.0 as the minimum supported API baseline for broader VS Code-compatible editor support. CI also tests latest stable VS Code so new runtime changes are caught without forcing older compatible editors off the extension.

## License

MIT
