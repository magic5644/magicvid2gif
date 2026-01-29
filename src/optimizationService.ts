import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { ConversionOptions } from './types';
import { SettingsPort } from './types/ports';

const execFileAsync = promisify(execFile);

export class OptimizationService {
  private readonly settings: SettingsPort;
  private gifsiclePath: string | null = null;

  constructor(settings: SettingsPort) {
    this.settings = settings;
  }

  public async checkGifsicle(): Promise<boolean> {
    const customPath = this.settings.get<string | undefined>('gifsiclePath', undefined);

    if (customPath && fs.existsSync(customPath)) {
      this.gifsiclePath = customPath;
      return true;
    }

    try {
      await execFileAsync('gifsicle', ['--version']);
      this.gifsiclePath = 'gifsicle';
      return true;
    } catch (error) {
      console.error(`Gifsicle not found in PATH : ${error}`);
      return false;
    }
  }

  public async optimize(inputPath: string, options: ConversionOptions): Promise<string> {
    if (!this.gifsiclePath) {
      await this.checkGifsicle();
    }

    if (!this.gifsiclePath) {
        throw new Error('Gifsicle not available');
    }
    const gifsiclePath = this.gifsiclePath;

    const tempPath = path.join(os.tmpdir(), `optimized_${Date.now()}.gif`);

      // Build Gifsicle command
    const args: string[] = [
      '--optimize=3',
      `--colors=${options.colorCount}`,
      ...(options.lossyCompression > 0 ? [`--lossy=${options.lossyCompression}`] : []),
      '--no-warnings',
      '--no-interlace',
      '--careful',
      '-o',
      tempPath,
      inputPath
    ];

    try {
      await execFileAsync(gifsiclePath, args);
      return tempPath;
    } catch (error) {
        console.error(`Gifsicle error: ${error}`);
      // If optimization fails, return the original path
      return inputPath;
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
