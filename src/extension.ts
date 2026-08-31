import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { createUniqueOutputPath, isValidResolution, parseNumberInput, validateConversionOptions } from './conversionOptions';
import { FfmpegManager } from './ffmpegManager';
import { OptimizationService } from './optimizationService';
import { ConversionOptions, VideoMetadata } from './types';
import { VideoConverter } from './videoConverter';
import { createSettingsPort, createUiPort, createWorkspacePort } from './platform/vscode';

let converter: VideoConverter;
let optimizer: OptimizationService;
let ffmpegManager: FfmpegManager;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('MagicVid2Gif extension is now active');

  const ui = createUiPort();
  const settings = createSettingsPort('magicvid2gif');
  const workspacePort = createWorkspacePort(context);

  // Initialize FFmpeg manager
  ffmpegManager = FfmpegManager.getInstance({ ui, settings, workspace: workspacePort });

  // Check FFmpeg at startup without downloading external binaries implicitly.
  const ffmpegPath = await ffmpegManager.getFfmpegPath();
  if (!ffmpegPath) {
    const config = vscode.workspace.getConfiguration('magicvid2gif');
    if (config.get('autoInstallFfmpeg', true)) {
      vscode.window.showWarningMessage(
        'FFmpeg is not installed. MagicVid2Gif can download FFmpeg and FFprobe when needed.',
        'Install now'
      ).then(selection => {
        if (selection === 'Install now') {
          vscode.commands.executeCommand('magicvid2gif.installFfmpeg');
        }
      });
    }
  }

  converter = new VideoConverter(ffmpegManager);
  optimizer = new OptimizationService(settings);

  // Manual FFmpeg installation command
  const installCmd = vscode.commands.registerCommand(
    'magicvid2gif.installFfmpeg',
    async () => {
      const installed = await ffmpegManager.installFfmpeg(true);
      if (installed) {
        const version = await ffmpegManager.getVersion();
        vscode.window.showInformationMessage(`FFmpeg ${version} installed successfully!`);
        // Reinitialize the converter with the new path
        converter = new VideoConverter(ffmpegManager);
      }
    }
  );

  // Quick command with default parameters
  const disposableQuick = vscode.commands.registerCommand(
    'magicvid2gif.convert', 
    async (uri: vscode.Uri) => {
      if (!uri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          uri = activeEditor.document.uri;
        } else {
          vscode.window.showErrorMessage('Please select a video in the explorer');
          return;
        }
      }

      try {
        // Ensure FFmpeg is ready
        const ready = await converter.initialize();
        if (!ready) {
          vscode.window.showErrorMessage('FFmpeg is not available. Use the "Install FFmpeg" command.');
          return;
        }

        const config = vscode.workspace.getConfiguration('magicvid2gif');
        const options: ConversionOptions = {
          startTime: config.get('defaultStartTime', 0),
          duration: config.get('defaultDuration', 0),
          resolution: config.get('defaultResolution', '1920:1080'),
          fps: config.get('defaultFps', 30),
          colorCount: config.get('colorCount', 128),
          optimizationLevel: config.get('optimizationLevel', 'ultra'),
          dithering: config.get('dithering', true),
          lossyCompression: config.get('lossyCompression', 80)
        };

        const validationError = validateConversionOptions(options);
        if (validationError) {
          vscode.window.showErrorMessage(`Invalid MagicVid2Gif settings: ${validationError}`);
          return;
        }

        await executeConversion(uri.fsPath, options);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Conversion error: ${message}`);
      }
    }
  );

  // Command with advanced options
  const disposableOptions = vscode.commands.registerCommand(
    'magicvid2gif.convertWithOptions',
    async (uri: vscode.Uri) => {
      if (!uri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          uri = activeEditor.document.uri;
        } else {
          vscode.window.showErrorMessage('Please select a video in the explorer');
          return;
        }
      }

      try {
        // Ensure FFmpeg is ready before showing options
        const ready = await converter.initialize();
        if (!ready) {
          vscode.window.showErrorMessage('FFmpeg is not available. Installation required.');
          return;
        }

        const options = await showOptionsDialog(uri.fsPath);
        if (options) {
          await executeConversion(uri.fsPath, options);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Conversion error: ${message}`);
      }
    }
  );

  context.subscriptions.push(disposableQuick, disposableOptions, installCmd);

  // Export internals for tests
  (module as any).exports._getFfmpegManager = () => ffmpegManager;

  // Debug: log registered commands for test visibility
  vscode.commands.getCommands().then(cmds => {
    console.log('Commands after activation:', cmds.filter(c => c.startsWith('magicvid2gif')));
  });
}

async function showOptionsDialog(videoPath: string): Promise<ConversionOptions | null> {
  const videoInfo = await getVideoMetadataSafe(videoPath);
  const startTime = await promptStartTime();
  if (startTime === null) {return null;}

  const duration = await promptDuration(videoInfo, startTime);
  if (duration === null) {return null;}

  const resolution = await promptResolution(videoInfo);
  if (!resolution) {return null;}

  const fps = await promptFps(videoInfo);
  if (fps === null) {return null;}

  const profile = await promptOptimizationProfile();
  if (!profile) {return null;}

  const advanced = ('custom' in profile && profile.custom) ? await promptCustomOptimization() : profile;
  if (!advanced) {return null;}

  const options: ConversionOptions = {
    startTime,
    duration,
    resolution,
    fps,
    colorCount: advanced.colorCount,
    optimizationLevel: advanced.optimizationLevel,
    dithering: advanced.dithering,
    lossyCompression: advanced.lossyCompression
  };

  const validationError = validateConversionOptions(options, videoInfo);
  if (validationError) {
    vscode.window.showErrorMessage(`Invalid conversion options: ${validationError}`);
    return null;
  }

  return options;
}

async function getVideoMetadataSafe(videoPath: string): Promise<VideoMetadata> {
  try {
    return await converter.getVideoInfo(videoPath);
  } catch {
    vscode.window.showWarningMessage('Unable to parse the video, using default values');
    return { duration: 60, width: 1920, height: 1080, fps: 30 };
  }
}

async function promptStartTime(): Promise<number | null> {
  const value = await vscode.window.showInputBox({
    prompt: 'Start time (seconds)',
    value: '0',
    validateInput: (val: string) => {
      return parseNumberInput(val, { min: 0 }) === null ? 'Please enter a positive number' : undefined;
    }
  });
  return value === undefined ? null : Number.parseFloat(value);
}

async function promptDuration(videoInfo: VideoMetadata, startTime: number): Promise<number | null> {
  const value = await vscode.window.showInputBox({
    prompt: `Duration (seconds, 0 = until the end). Total duration: ${videoInfo.duration.toFixed(1)}s`,
    value: '0',
    validateInput: (val: string) => {
      const num = parseNumberInput(val, { min: 0 });
      if (num === null) {return 'Please enter a positive number';}
      if (videoInfo.duration > 0 && num > 0 && startTime + num > videoInfo.duration) {
        return `Start time plus duration exceeds the video length (${videoInfo.duration.toFixed(1)}s)`;
      }
      return undefined;
    }
  });
  return value === undefined ? null : Number.parseFloat(value);
}

async function promptResolution(videoInfo: VideoMetadata): Promise<string | null> {
  const choice = await vscode.window.showQuickPick([
    { label: `Original (${videoInfo.width}x${videoInfo.height})`, value: `${videoInfo.width}:${videoInfo.height}` },
    { label: '4K Ultra HD (3840x2160)', value: '3840:2160' },
    { label: '1080p Full HD (1920x1080)', value: '1920:1080' },
    { label: '720p HD (1280:720)', value: '1280:720' },
    { label: '480p SD (854:480)', value: '854:480' },
    { label: '360p (640:360)', value: '640:360' },
    { label: 'Custom (format: width:height)', value: 'custom' }
  ], {
    placeHolder: 'Select output resolution',
    canPickMany: false
  });

  if (!choice) {return null;}
  if (choice.value !== 'custom') {
    return choice.value;
  }

  const customRes = await vscode.window.showInputBox({
    prompt: 'Custom resolution (format: width:height or -1:height to keep aspect ratio)',
    value: '1920:1080',
    validateInput: (val: string) => isValidResolution(val) ? undefined : 'Invalid format. Use width:height, -1:height, or width:-1'
  });
  return customRes || null;
}

async function promptFps(videoInfo: VideoMetadata): Promise<number | null> {
  const fpsStr = await vscode.window.showInputBox({
    prompt: "Frames per second (FPS, leave empty to keep original)",
    value: videoInfo.fps.toFixed(0),
    validateInput: (val: string) => {
      if (val.trim().length === 0) {return undefined;}
      const num = Number.parseInt(val, 10);
      return (Number.isNaN(num) || num < 1 || num > 60) ? 'FPS must be between 1 and 60' : undefined;
    }
  });
  if (fpsStr === undefined) {return null;}
  return fpsStr.trim().length === 0 ? 0 : Number.parseInt(fpsStr, 10);
}

type ResolvedProfile = {
  colorCount: number;
  optimizationLevel: 'fast' | 'balanced' | 'quality' | 'ultra';
  dithering: boolean;
  lossyCompression: number;
  custom?: false;
};
type ProfileChoice = ResolvedProfile | { custom: true };

async function promptOptimizationProfile(): Promise<ProfileChoice | null> {
  const quickPick = await vscode.window.showQuickPick([
    { label: '$(zap) Max quality (256 colors)', value: { colorCount: 256, optimization: 'ultra' as const, dithering: true, lossyCompression: 80 } },
    { label: '$(check) Balanced (128 colors)', value: { colorCount: 128, optimization: 'balanced' as const, dithering: true, lossyCompression: 50 }, picked: true },
    { label: '$(dash) Small file (64 colors)', value: { colorCount: 64, optimization: 'fast' as const, dithering: true, lossyCompression: 30 } },
    { label: '$(gear) Custom...', value: 'custom' as const }
  ], {
    placeHolder: "Optimization profile"
  });

  if (!quickPick) {return null;}
  if (quickPick.value === 'custom') {
    return { custom: true };
  }

  return {
    colorCount: quickPick.value.colorCount,
    optimizationLevel: quickPick.value.optimization,
    dithering: quickPick.value.dithering,
    lossyCompression: quickPick.value.lossyCompression
  };
}

async function promptCustomOptimization(): Promise<ResolvedProfile | null> {
  const colorPick = await vscode.window.showQuickPick([
    { label: '64 colors (smaller file)', value: 64 },
    { label: '128 colors (recommended)', value: 128 },
    { label: '256 colors (best quality)', value: 256 }
  ], { placeHolder: 'Number of colors' });
  if (!colorPick) {return null;}

  const optPick = await vscode.window.showQuickPick([
    { label: 'Ultra (best compression)', value: 'ultra' as const },
    { label: 'Quality (balanced)', value: 'quality' as const },
    { label: 'Fast', value: 'fast' as const }
  ], { placeHolder: "Optimization level" });
  if (!optPick) {return null;}

  const ditherRes = await vscode.window.showQuickPick([
    { label: 'Yes (smoother gradients)', value: true, picked: true },
    { label: 'No (fewer artifacts)', value: false }
  ], { placeHolder: "Enable Bayer dithering?" });
  if (!ditherRes) {return null;}

  const lossyCompression = await promptLossyCompression();
  if (lossyCompression === null) {return null;}

  return {
    colorCount: colorPick.value,
    optimizationLevel: optPick.value,
    dithering: ditherRes.value,
    lossyCompression
  };
}

async function promptLossyCompression(): Promise<number | null> {
  const value = await vscode.window.showInputBox({
    prompt: 'Gifsicle lossy compression (0-200, 0 = lossless)',
    value: '80',
    validateInput: (val: string) => {
      return parseNumberInput(val, { min: 0, max: 200 }) === null ? 'Lossy compression must be between 0 and 200' : undefined;
    }
  });

  return value === undefined ? null : Number.parseInt(value, 10);
}

async function executeConversion(inputPath: string, options: ConversionOptions): Promise<void> {
  const progressOptions: vscode.ProgressOptions = {
    location: vscode.ProgressLocation.Notification,
    title: "🎬 Video → GIF Conversion",
    cancellable: true
  };

  await vscode.window.withProgress(progressOptions, async (progress, token) => {
    const startTime = Date.now();

    let displayedPercent = 0;
    const updateProgress = (newPercent: number, message?: string) => {
      const clamped = Math.min(100, Math.max(newPercent, displayedPercent));
      const increment = clamped - displayedPercent;
      if (increment > 0) {
        progress.report({ increment, message });
        displayedPercent = clamped;
      } else if (message) {
        progress.report({ message });
      }
    };

    updateProgress(0, "Preparing...");

    // Final FFmpeg check
    const ffmpegPath = await ffmpegManager.getFfmpegPath();
    if (!ffmpegPath) {
      throw new Error('FFmpeg not available. Installation required.');
    }

    const validationError = validateConversionOptions(options);
    if (validationError) {
      throw new Error(validationError);
    }

    const outputPath = createUniqueOutputPath(inputPath);
    let optimizationStatus = 'skipped';
    const progressCallback = (percent: number) => {
      const adjusted = Math.min(Math.max(percent, 0), 100);
      const mapped = 5 + (adjusted * 0.8);
      updateProgress(mapped, `Conversion... ${Math.round(mapped)}%`);
    };

    updateProgress(5, "Analyzing video...");

    try {
      await converter.convert(inputPath, outputPath, options, progressCallback, token);

      const gifsicleAvailable = await optimizer.checkGifsicle();
      if (gifsicleAvailable && options.optimizationLevel !== 'fast') {
        updateProgress(95, "Final optimization...");
        const result = await optimizer.optimize(outputPath, options);
        optimizationStatus = result.optimized ? 'optimized with Gifsicle' : `skipped (${result.skippedReason ?? result.error ?? 'Gifsicle failed'})`;

        if (result.outputPath !== outputPath && fs.existsSync(result.outputPath)) {
          fs.unlinkSync(outputPath);
          fs.renameSync(result.outputPath, outputPath);
        }
      } else if (!gifsicleAvailable) {
        optimizationStatus = 'skipped (Gifsicle not found)';
        updateProgress(90, "Skipping Gifsicle optimization.");
      } else {
        optimizationStatus = 'skipped (fast profile)';
        updateProgress(90, "Skipping final optimization.");
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      // Final statistics
      const stats = fs.statSync(outputPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const ffmpegVersion = await converter.getFfmpegVersion();

      updateProgress(100, "Done!");

      // Success message with actions
      const result = await vscode.window.showInformationMessage(
        `GIF created: ${sizeMB}MB in ${duration}s | FFmpeg ${ffmpegVersion} | Optimization: ${optimizationStatus}`,
        'Open',
        'Folder',
        'Copy path'
      );

      if (result === 'Open') {
        await vscode.env.openExternal(vscode.Uri.file(outputPath));
      } else if (result === 'Folder') {
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
      } else if (result === 'Copy path') {
        await vscode.env.clipboard.writeText(outputPath);
        vscode.window.showInformationMessage('Path copied');
      }
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      throw error;
    }
  });
}

export function deactivate(): void {
  if (converter) {
    converter.destroy();
  }
}
