import { ChildProcessWithoutNullStreams, execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { FfmpegManager } from './ffmpegManager';
import { CancellationSignal, ConversionOptions, ProgressCallback, VideoMetadata } from './types';

const execFileAsync = promisify(execFile);

interface FfprobeStream extends Record<string, unknown> {
  width?: number;
  height?: number;
}

interface FfprobeOutput {
  format?: {
    duration?: string | number;
  };
  streams?: FfprobeStream[];
}

export function parseFps(value: string | undefined): number {
  if (!value || value === '0/0') {
    return 30;
  }

  const [num, den] = value.split('/').map(Number);
  if (!Number.isFinite(num)) {
    return 30;
  }

  if (!Number.isFinite(den) || den === 0) {
    return num > 0 ? num : 30;
  }

  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? fps : 30;
}

export function parseFfmpegTimemark(line: string): number | null {
  const match = /time=(\d{2,}):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(line);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseFloat(match[3]);
  if (![hours, minutes, seconds].every(Number.isFinite)) {
    return null;
  }

  return (hours * 3600) + (minutes * 60) + seconds;
}

export function parseFfmpegProgressPercent(line: string, totalDuration: number): number | null {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
    return null;
  }

  const seconds = parseFfmpegTimemark(line);
  if (seconds === null) {
    return null;
  }

  return Math.min(100, Math.max(0, (seconds / totalDuration) * 100));
}

export function buildFilterComplex(options: ConversionOptions): string {
  const segments: string[] = [];

  if (options.resolution && options.resolution !== 'original') {
    segments.push(`scale=${options.resolution}:flags=lanczos`);
  }

  if (options.fps > 0) {
    segments.push(`fps=${Math.round(options.fps)}`);
  }

  const dither = options.dithering ? 'bayer' : 'none';
  segments.push(`split[s0][s1];[s0]palettegen=max_colors=${options.colorCount}:stats_mode=full[p];[s1][p]paletteuse=dither=${dither}`);

  return segments.join(',');
}

export function buildFfmpegArgs(inputPath: string, outputPath: string, options: ConversionOptions): string[] {
  const args = ['-hide_banner', '-y'];

  if (options.startTime > 0) {
    args.push('-ss', String(options.startTime));
  }

  if (options.duration > 0) {
    args.push('-t', String(options.duration));
  }

  args.push(
    '-i',
    inputPath,
    '-filter_complex',
    buildFilterComplex(options),
    '-loop',
    '0',
    outputPath
  );

  return args;
}

export class VideoConverter {
  private readonly ffmpegManager: FfmpegManager;
  private ffmpegPath: string | null = null;

  constructor(ffmpegManager: FfmpegManager) {
    this.ffmpegManager = ffmpegManager;
  }

  public async initialize(): Promise<boolean> {
    this.ffmpegPath = await this.ffmpegManager.ensureFfmpeg();
    return Boolean(this.ffmpegPath);
  }

  public async checkFfmpeg(): Promise<boolean> {
    const ffmpegPath = await this.ffmpegManager.getFfmpegPath();
    if (!ffmpegPath) {
      return false;
    }

    this.ffmpegPath = ffmpegPath;
    return true;
  }

  public async getVideoInfo(videoPath: string): Promise<VideoMetadata> {
    const ffprobePath = await this.ffmpegManager.getFfprobePath();
    if (!ffprobePath) {
      throw new Error('FFprobe is not available. Install FFmpeg again or add ffprobe to PATH.');
    }

    const { stdout } = await execFileAsync(ffprobePath, [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,avg_frame_rate,r_frame_rate:format=duration',
      '-of',
      'json',
      videoPath
    ], { maxBuffer: 10 * 1024 * 1024 });

    const metadata = JSON.parse(String(stdout)) as FfprobeOutput;
    const videoStream = metadata.streams?.find(stream => stream['codec_type'] === 'video') ?? metadata.streams?.[0];
    if (!videoStream) {
      throw new Error('No video stream found');
    }

    return {
      duration: Number(metadata.format?.duration) || 0,
      width: videoStream.width || 0,
      height: videoStream.height || 0,
      fps: parseFps(this.stringValue(videoStream['avg_frame_rate']) || this.stringValue(videoStream['r_frame_rate']))
    };
  }

  public async convert(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions,
    progressCallback: ProgressCallback,
    cancellationSignal?: CancellationSignal
  ): Promise<void> {
    if (!this.ffmpegPath) {
      const ready = await this.initialize();
      if (!ready) {
        throw new Error('FFmpeg is not available. Use the "Install FFmpeg" command.');
      }
    }

    const ffmpegPath = this.ffmpegPath;
    if (!ffmpegPath) {
      throw new Error('FFmpeg is not available. Use the "Install FFmpeg" command.');
    }

    await this.runFfmpegProcess(
      ffmpegPath,
      buildFfmpegArgs(inputPath, outputPath, options),
      options.duration,
      progressCallback,
      cancellationSignal
    );
  }

  public destroy(): void {
    // Conversion processes are scoped per convert() call and clean themselves up.
  }

  public getFfmpegVersion(): Promise<string> {
    return this.ffmpegManager.getVersion();
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private runFfmpegProcess(
    ffmpegPath: string,
    args: string[],
    effectiveDuration: number,
    progressCallback: ProgressCallback,
    cancellationSignal?: CancellationSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let stderrTail = '';
      let settled = false;
      let cancelled = Boolean(cancellationSignal?.isCancellationRequested);
      const child = spawn(ffmpegPath, args, { windowsHide: true });
      const cleanup = this.registerCancellation(child, cancellationSignal, () => {
        cancelled = true;
      });

      if (cancelled) {
        this.terminateProcess(child);
      }

      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderrTail = this.appendStderrTail(stderrTail, text);
        const percent = parseFfmpegProgressPercent(text, effectiveDuration);
        if (percent !== null) {
          progressCallback(percent);
        }
      });

      child.on('error', (error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      });

      child.on('close', (code, signal) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();

        if (cancelled) {
          reject(new Error('Conversion cancelled by user'));
          return;
        }

        if (code === 0) {
          progressCallback(100);
          resolve();
          return;
        }

        reject(new Error(`FFmpeg exited with code ${code ?? 'unknown'}${signal ? ` (${signal})` : ''}: ${stderrTail.trim()}`));
      });
    });
  }

  private registerCancellation(
    child: ChildProcessWithoutNullStreams,
    cancellationSignal: CancellationSignal | undefined,
    markCancelled: () => void
  ): () => void {
    if (!cancellationSignal) {
      return () => undefined;
    }

    const disposable = cancellationSignal.onCancellationRequested(() => {
      markCancelled();
      this.terminateProcess(child);
    });

    return () => {
      disposable.dispose();
    };
  }

  private terminateProcess(child: ChildProcessWithoutNullStreams): void {
    if (child.exitCode !== null) {
      return;
    }

    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, 2000).unref();
  }

  private appendStderrTail(current: string, next: string): string {
    const combined = current + next;
    return combined.length > 4000 ? combined.slice(-4000) : combined;
  }
}
