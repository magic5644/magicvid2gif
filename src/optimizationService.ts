import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { ConversionOptions, OptimizationResult } from './types';
import { SettingsPort } from './types/ports';

const execFileAsync = promisify(execFile);

export function buildGifsicleArgs(inputPath: string, outputPath: string, options: ConversionOptions): string[] {
  return [
    '--optimize=3',
    `--colors=${options.colorCount}`,
    ...(options.lossyCompression > 0 ? [`--lossy=${options.lossyCompression}`] : []),
    '--no-warnings',
    '--no-interlace',
    '--careful',
    '-o',
    outputPath,
    inputPath
  ];
}

export class OptimizationService {
  private readonly settings: SettingsPort;
  private gifsiclePath: string | null = null;

  constructor(settings: SettingsPort) {
    this.settings = settings;
  }

  public async checkGifsicle(): Promise<boolean> {
    const customPath = this.settings.get<string | undefined>('gifsiclePath', undefined);

    if (customPath && fs.existsSync(customPath)) {
      try {
        await execFileAsync(customPath, ['--version']);
        this.gifsiclePath = customPath;
        return true;
      } catch {
        this.gifsiclePath = null;
        return false;
      }
    }

    try {
      await execFileAsync('gifsicle', ['--version']);
      this.gifsiclePath = 'gifsicle';
      return true;
    } catch {
      this.gifsiclePath = null;
      return false;
    }
  }

  public async optimize(inputPath: string, options: ConversionOptions): Promise<OptimizationResult> {
    if (!this.gifsiclePath) {
      await this.checkGifsicle();
    }

    if (!this.gifsiclePath) {
      return {
        outputPath: inputPath,
        optimized: false,
        skippedReason: 'Gifsicle not available'
      };
    }

    const gifsiclePath = this.gifsiclePath;

    const tempPath = path.join(os.tmpdir(), `magicvid2gif_optimized_${process.pid}_${Date.now()}.gif`);
    const args = buildGifsicleArgs(inputPath, tempPath, options);

    try {
      await execFileAsync(gifsiclePath, args);
      return {
        outputPath: tempPath,
        optimized: true
      };
    } catch (error) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {
        // Best-effort cleanup.
      }

      const message = error instanceof Error ? error.message : String(error);
      return {
        outputPath: inputPath,
        optimized: false,
        error: message
      };
    }
  }

  public async getGifInfo(gifPath: string): Promise<{ size: number; frames: number }> {
    if (!this.gifsiclePath) {
      await this.checkGifsicle();
    }

    if (!this.gifsiclePath) {
      throw new Error('Gifsicle not available');
    }
    const gifsiclePath = this.gifsiclePath;

    try {
      const stats = fs.statSync(gifPath);

      // Count frames with gifsicle
      const { stdout } = await execFileAsync(gifsiclePath, ['--info', gifPath]);
      const frameMatch = new RegExp(/(\d+) images/).exec(stdout);
      const frames = frameMatch ? Number.parseInt(frameMatch[1], 10) : 0;

      return {
        size: stats.size,
        frames: frames
      };
    } catch (error) {
      console.error(`Gifsicle info error: ${error}`);
      return {
        size: fs.statSync(gifPath).size,
        frames: 0
      };
    }
  }
}
