# Magic Vid2Gif 🎩✨

<div align="center">
  <img src="medias/logo.png" alt="Magic Vid2Gif Logo" width="400"/>
</div>

VS Code extension and other vscode like editors that convert videos to optimized GIFs with bundled FFmpeg. It aims for high visual quality with minimal file size and zero external setup.

[![Version](https://img.shields.io/visual-studio-marketplace/v/magic5644.magicvid2gif?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=magic5644.magicvid2gif)
[![Open VSX Version](https://img.shields.io/open-vsx/v/magic5644/magicvid2gif?label=Open%20VSX&logo=eclipse&logoColor=white)](https://open-vsx.org/extension/magic5644/magicvid2gif)
[![License](https://img.shields.io/github/license/magic5644/magicvid2gif)](https://github.com/magic5644/magicvid2gif/blob/main/LICENSE)
[![Github stars](https://img.shields.io/github/stars/magic5644/magicvid2gif?style=flat&color=gold&logo=github)](https://github.com/magic5644/magicvid2gif)
[![vscode downloads](https://img.shields.io/visual-studio-marketplace/d/magic5644.magicvid2gif?label=vscode%20Marketplace%20Downloads)](https://marketplace.visualstudio.com/items?itemName=magic5644.magicvid2gif)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/magic5644/magicvid2gif?label=Open%20VSX%20Downloads)](https://open-vsx.org/extension/magic5644/magicvid2gif)

## Features

- Fast default conversion and an advanced options flow (start time, duration, resolution, FPS, palette).
- High-quality pipeline: Lanczos scaling, global palette generation, ordered dithering.
- Optional Gifsicle post-optimization (lossy/lossless).
- Strict TypeScript types, modular architecture, progress notifications, and cancelable runs.

## Requirements

- Node.js 20+
- FFmpeg (auto-downloaded by the extension if missing)
  - Troubleshooting: If the extension cannot extract FFmpeg, ensure your system has `unzip` (macOS/Linux) or PowerShell available on Windows; for `.tar.xz` archives ensure `tar` is present. If detection fails, the extension attempts to resolve the absolute `ffmpeg` executable (`command -v ffmpeg` on POSIX, `where ffmpeg` on Windows).
- Optional: Gifsicle for extra optimization

## Usage

1) Right-click a video (`.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, etc.) in the Explorer.  
2) Choose **“Convert to GIF (Quick)”** for defaults or **“Convert to GIF (Advanced Options)”** to tweak settings.  
3) Watch progress in the notification area; the resulting GIF is saved next to the source file.

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

## Scripts

- `npm run build:esbuild` – bundle to `dist/extension.js`
{- `npm run compile` – TypeScript to `out/` (tests)}
- `npm run test:unit` – unit tests
- `npm run test:e2e` – VS Code integration tests

## Project structure

```bash
src/
├─ extension.ts          // Entry point, commands, UI flow
├─ videoConverter.ts     // FFmpeg pipeline
├─ optimizationService.ts// Gifsicle optimizations
└─ types.ts              // Shared interfaces
```

## Packaging

```bash
npm run package   # uses vsce package
```

## License

MIT
