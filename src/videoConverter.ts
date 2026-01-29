import { exec } from 'node:child_process';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { FfmpegManager } from './ffmpegManager';
import { ConversionOptions, FfmpegProgress, ProgressCallback, VideoMetadata } from './types';

const execAsync = promisify(exec);

export class VideoConverter {
  private currentCommand: ffmpeg.FfmpegCommand | null = null;
  private readonly ffmpegManager: FfmpegManager;
  private ffmpegPath: string | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.ffmpegManager = FfmpegManager.getInstance(context);
  }

  /**
   * Initializes FFmpeg (checks or downloads)
   */
  public async initialize(): Promise<boolean> {
    this.ffmpegPath = await this.ffmpegManager.ensureFfmpeg();
    if (this.ffmpegPath) {
      ffmpeg.setFfmpegPath(this.ffmpegPath);
      return true;
    }
    return false;
  }

  public async checkFfmpeg(): Promise<boolean> {
    const path = await this.ffmpegManager.getFfmpegPath();
    if (path) {
      this.ffmpegPath = path;
      ffmpeg.setFfmpegPath(path);
      return true;
    }
    return false;
  }

  public async getVideoInfo(videoPath: string): Promise<VideoMetadata> {
    // Ensure FFmpeg is initialized
    if (!this.ffmpegPath) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: ffmpeg.FfprobeData) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        // Compute FPS from fraction (e.g., "30000/1001")
        let fps = 30;
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          if (den && den !== 0) {
            fps = num / den;
          }
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: fps
        });
      });
    });
  }

  public async convert(
    inputPath: string, 
    outputPath: string, 
    options: ConversionOptions, 
    progressCallback: ProgressCallback
  ): Promise<void> {
    // Ensure FFmpeg is ready
    if (!this.ffmpegPath) {
      const ready = await this.initialize();
      if (!ready) {
        throw new Error("FFmpeg n'est pas disponible. Veuillez l'installer via la commande \"Installer FFmpeg\".");
      }
    }

    return new Promise((resolve, reject) => {
      const effectiveDuration = options.duration === 0 ? undefined : options.duration;

      const filterComplex = this.buildFilterComplex(options);

      // Additional optimization options
      const optimizationFlags = this.getOptimizationFlags(options.optimizationLevel);

      let cmd: ffmpeg.FfmpegCommand = ffmpeg(inputPath).seekInput(options.startTime || 0);
      if (effectiveDuration !== undefined) {
        cmd = cmd.duration(effectiveDuration);
      }

      this.currentCommand = cmd
        .complexFilter(filterComplex)
        .outputOptions([
          '-loop', '0', // Loop infini
          ...optimizationFlags
        ])
        .on('start', (commandLine: string) => {
          console.log('Commande FFmpeg:', commandLine);
        })
        .on('progress', (progress: FfmpegProgress) => {
          if (progress.percent) {
            // Cap at 85% because Gifsicle optimization may follow
            const adjustedPercent = Math.min(Math.round(progress.percent * 0.85), 85);
            progressCallback(adjustedPercent);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err: Error) => {
          if (err.message.includes('ffmpeg was killed')) {
            reject(new Error('Conversion cancelled by user'));
          } else {
            reject(err);
          }
        });

      this.currentCommand.save(outputPath);
    });
  }

  private getOptimizationFlags(level: string): string[] {
    // Keep FFmpeg options minimal and valid for GIF output.
    // Avoid injecting duplicate filtergraphs (-lavfi) or non-existent flags like -optimization/-lossless.
    // Future options could be added here per-level, but ensure they are valid ffmpeg CLI args.
    return [];
  }

  private buildFilterComplex(options: ConversionOptions): string {
    const segments: string[] = [];

    if (options.resolution && options.resolution !== 'original') {
      segments.push(`scale=${options.resolution}:flags=lanczos`);
    }

    if (options.fps) {
      segments.push(`fps=${options.fps}`);
    }

    const paletteBase = `split[s0][s1];[s0]palettegen=max_colors=${options.colorCount}:stats_mode=full[p];[s1][p]paletteuse`;
    const dither = options.dithering ? 'bayer' : 'none';

    segments.push(`${paletteBase}=dither=${dither}`);

    return segments.join(',');
  }

  public cancel(): void {
    if (this.currentCommand) {
      this.currentCommand.kill('SIGTERM');
    }
  }

  public destroy(): void {
    this.cancel();
  }

  public getFfmpegVersion(): Promise<string> {
    return this.ffmpegManager.getVersion();
  }
}
