import { exec, execFile } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as https from 'node:https';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { SettingsPort, UiPort, WorkspacePort } from './types/ports';

const unzipper = require('unzipper');

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

interface FfmpegAsset {
  url: string;
  filename: string;
  executableName: string;
  extractPath: string;
  extraExecutables?: string[];
  archiveSha256?: string;
  binarySha256?: string;
}

interface FfmpegBinary {
  label: string;
  primary: FfmpegAsset;
  probe?: FfmpegAsset;
}

type SupportedPlatform = 'win32' | 'darwin' | 'linux';
type SupportedArch = 'x64' | 'arm64';

interface InstallProgressRange {
  start: number;
  downloadEnd: number;
  verifyEnd: number;
}

export class FfmpegManager {
  private static instance: FfmpegManager;
  private readonly ui: UiPort;
  private readonly settings: SettingsPort;
  private readonly workspace: WorkspacePort;
  private ffmpegPath: string | null = null;
  private ffprobePath: string | null = null;
  private isDownloading: boolean = false;

  private readonly downloadUrls: Record<SupportedPlatform, Partial<Record<SupportedArch, FfmpegBinary>>> = {
    win32: {
      x64: {
        label: 'Windows x64',
        primary: {
          url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n9.0-latest-win64-lgpl-9.0.zip',
          filename: 'ffmpeg-n9.0-latest-win64-lgpl-9.0.zip',
          extractPath: 'ffmpeg-n9.0-latest-win64-lgpl-9.0/bin',
          executableName: 'ffmpeg.exe',
          extraExecutables: ['ffprobe.exe'],
          archiveSha256: '21f9888f23c4389f9c9209cd2653c4f9c05351407fe253a1d3ea619ad46c7619'
        }
      },
      arm64: {
        label: 'Windows arm64',
        primary: {
          url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n9.0-latest-winarm64-lgpl-9.0.zip',
          filename: 'ffmpeg-n9.0-latest-winarm64-lgpl-9.0.zip',
          extractPath: 'ffmpeg-n9.0-latest-winarm64-lgpl-9.0/bin',
          executableName: 'ffmpeg.exe',
          extraExecutables: ['ffprobe.exe'],
          archiveSha256: 'eeda8e1178871f278ca4168d795e92c7d69305617c36370d2f231459918913cf'
        }
      }
    },
    darwin: {
      x64: {
        label: 'macOS Intel',
        primary: {
          url: 'https://evermeet.cx/ffmpeg/ffmpeg-9.0.1.zip',
          filename: 'ffmpeg-9.0.1-macos-x64.zip',
          extractPath: '',
          executableName: 'ffmpeg',
          archiveSha256: '8a8c9e549983409fe6604b9aa665648b7a5def9407fe814c39c8b2ea7f64a48f',
          binarySha256: 'e27de05e3a9f9c758f9766d15d1a069fddeed5f725e35d9ab28683be4740dad7'
        },
        probe: {
          url: 'https://evermeet.cx/ffmpeg/ffprobe-9.0.1.zip',
          filename: 'ffprobe-9.0.1-macos-x64.zip',
          extractPath: '',
          executableName: 'ffprobe',
          archiveSha256: 'd13f35db03456b7f65b7edb6437c86e23810fbfe91795e571f5b77211343b4f1',
          binarySha256: 'a1508faa028bfb8e20c9d182c3d41fcff29ee7584ae21b2d6c357472a3ecbc24'
        }
      },
      arm64: {
        label: 'macOS Apple Silicon',
        primary: {
          url: 'https://www.osxexperts.net/ffmpeg9arm.zip',
          filename: 'ffmpeg-9.0-macos-arm64.zip',
          extractPath: '',
          executableName: 'ffmpeg',
          binarySha256: '591260c945d0eef150e3bf82b0ef988bd36a9cecc18ff05d6679617159f0a95e'
        },
        probe: {
          url: 'https://www.osxexperts.net/ffprobe9arm.zip',
          filename: 'ffprobe-9.0-macos-arm64.zip',
          extractPath: '',
          executableName: 'ffprobe',
          binarySha256: 'e11c17e8200b3ee4c4c186d245e2b4053f01d56957336c1817fca0b997469106'
        }
      }
    },
    linux: {
      x64: {
        label: 'Linux x64',
        primary: {
          url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n9.0-latest-linux64-lgpl-9.0.tar.xz',
          filename: 'ffmpeg-n9.0-latest-linux64-lgpl-9.0.tar.xz',
          extractPath: 'ffmpeg-n9.0-latest-linux64-lgpl-9.0/bin',
          executableName: 'ffmpeg',
          extraExecutables: ['ffprobe'],
          archiveSha256: '9f44802ad67af5cabb1eb58f3191a791418118c5d87092e46f73a3607352e03e'
        }
      },
      arm64: {
        label: 'Linux arm64',
        primary: {
          url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n9.0-latest-linuxarm64-lgpl-9.0.tar.xz',
          filename: 'ffmpeg-n9.0-latest-linuxarm64-lgpl-9.0.tar.xz',
          extractPath: 'ffmpeg-n9.0-latest-linuxarm64-lgpl-9.0/bin',
          executableName: 'ffmpeg',
          extraExecutables: ['ffprobe'],
          archiveSha256: 'bbf9f7c99312899e2a0a76cc5ef6ef904e0a5c1617765978509872d561e81fec'
        }
      }
    }
  };

  constructor(deps: { ui: UiPort; settings: SettingsPort; workspace: WorkspacePort }) {
    this.ui = deps.ui;
    this.settings = deps.settings;
    this.workspace = deps.workspace;
  }

  public static getInstance(deps: { ui: UiPort; settings: SettingsPort; workspace: WorkspacePort }): FfmpegManager {
    if (!FfmpegManager.instance) {
      FfmpegManager.instance = new FfmpegManager(deps);
    }
    return FfmpegManager.instance;
  }

  public async getFfmpegPath(): Promise<string | null> {
    const cachedPath = await this.verifyCachedPath(this.ffmpegPath, 'ffmpeg');
    if (cachedPath) {
      return cachedPath;
    }

    const bundledPath = await this.verifyBundledPath(this.getExecutableName(), 'ffmpeg');
    if (bundledPath) {
      this.ffmpegPath = bundledPath;
      return bundledPath;
    }

    const systemPath = await this.resolveSystemBinary('ffmpeg');
    if (systemPath) {
      this.ffmpegPath = systemPath;
      return systemPath;
    }

    return null;
  }

  public async getFfprobePath(): Promise<string | null> {
    const cachedPath = await this.verifyCachedPath(this.ffprobePath, 'ffprobe');
    if (cachedPath) {
      return cachedPath;
    }

    const bundledPath = await this.verifyBundledPath(this.getProbeExecutableName(), 'ffprobe');
    if (bundledPath) {
      this.ffprobePath = bundledPath;
      return bundledPath;
    }

    const ffmpegPath = await this.getFfmpegPath();
    if (ffmpegPath && path.isAbsolute(ffmpegPath)) {
      const siblingProbe = path.join(path.dirname(ffmpegPath), this.getProbeExecutableName());
      const verifiedSibling = await this.verifyCachedPath(siblingProbe, 'ffprobe');
      if (verifiedSibling) {
        this.ffprobePath = verifiedSibling;
        return verifiedSibling;
      }
    }

    const systemPath = await this.resolveSystemBinary('ffprobe');
    if (systemPath) {
      this.ffprobePath = systemPath;
      return systemPath;
    }

    return null;
  }

  public async installFfmpeg(force: boolean = false): Promise<boolean> {
    if (this.isDownloading) {
      this.ui.info('FFmpeg download already in progress.');
      return false;
    }

    const binaryInfo = this.resolveBinary(os.platform(), os.arch());
    if (!binaryInfo) {
      return false;
    }

    const { globalStorage, ffmpegDir } = this.computePaths();
    if (!force && await this.existingInstallIsValid(ffmpegDir, binaryInfo)) {
      this.ui.info('FFmpeg is already installed.');
      return true;
    }

    this.isDownloading = true;

    try {
      await this.ui.withProgress(`Installing FFmpeg for ${binaryInfo.label}`, async (update) => {
        await this.performInstallSteps({ binaryInfo, globalStorage, ffmpegDir, update, platform: os.platform() });
      });

      this.ui.info('FFmpeg installed successfully.');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`FFmpeg install error: ${message}`);
      return false;
    } finally {
      this.isDownloading = false;
    }
  }

  public async ensureFfmpeg(): Promise<string | null> {
    const existingPath = await this.getFfmpegPath();
    if (existingPath) {
      return existingPath;
    }

    const autoInstall = this.settings.get<boolean>('autoInstallFfmpeg', true);
    if (!autoInstall) {
      await this.ui.error(
        'FFmpeg is required. Install it manually or enable automatic installation in settings.',
        ['Ok']
      );
      return null;
    }

    const choice = await this.ui.info(
      'FFmpeg is not installed. Download FFmpeg and FFprobe automatically?',
      ['Download', 'Cancel']
    );

    if (choice !== 'Download') {
      return null;
    }

    const installed = await this.installFfmpeg();
    return installed ? await this.getFfmpegPath() : null;
  }

  public async getVersion(): Promise<string> {
    const ffmpegPath = await this.getFfmpegPath();
    if (!ffmpegPath) {
      return 'Not installed';
    }

    try {
      const { stdout } = await execFileAsync(ffmpegPath, ['-version']);
      const match = /ffmpeg version ([^\s]+)/.exec(stdout);
      return match ? match[1] : 'Unknown';
    } catch {
      return 'Error';
    }
  }

  private resolveBinary(platform: NodeJS.Platform, arch: string): FfmpegBinary | null {
    if (!this.isSupportedPlatform(platform)) {
      this.ui.error(`Unsupported platform: ${platform}-${arch}. Install FFmpeg manually.`);
      return null;
    }

    const normalizedArch = this.normalizeArch(arch);
    const binaryInfo = normalizedArch ? this.downloadUrls[platform][normalizedArch] : undefined;
    if (!binaryInfo) {
      this.ui.error(`Unsupported platform: ${platform}-${arch}. Install FFmpeg manually.`);
      return null;
    }

    return binaryInfo;
  }

  private isSupportedPlatform(platform: NodeJS.Platform): platform is SupportedPlatform {
    return platform === 'win32' || platform === 'darwin' || platform === 'linux';
  }

  private normalizeArch(arch: string): SupportedArch | null {
    if (arch === 'x64') {
      return 'x64';
    }

    if (arch === 'arm64') {
      return 'arm64';
    }

    return null;
  }

  private computePaths(): { globalStorage: string; ffmpegDir: string } {
    const globalStorage = this.workspace.storagePath() || os.tmpdir();
    return {
      globalStorage,
      ffmpegDir: path.join(globalStorage, 'ffmpeg')
    };
  }

  private async existingInstallIsValid(ffmpegDir: string, binaryInfo: FfmpegBinary): Promise<boolean> {
    const expectedExecutables = [
      binaryInfo.primary.executableName,
      ...(binaryInfo.primary.extraExecutables ?? []),
      ...(binaryInfo.probe ? [binaryInfo.probe.executableName] : [])
    ];

    for (const executableName of expectedExecutables) {
      const executablePath = path.join(ffmpegDir, executableName);
      if (!fs.existsSync(executablePath)) {
        return false;
      }

      try {
        await execFileAsync(executablePath, ['-version']);
      } catch {
        return false;
      }
    }

    return true;
  }

  private async ensureDirectories(globalStorage: string, ffmpegDir: string): Promise<void> {
    await fs.promises.mkdir(globalStorage, { recursive: true });
    await fs.promises.mkdir(ffmpegDir, { recursive: true });
  }

  private async performInstallSteps(opts: {
    binaryInfo: FfmpegBinary;
    globalStorage: string;
    ffmpegDir: string;
    update: (percent: number, message?: string) => void;
    platform: NodeJS.Platform;
  }): Promise<void> {
    const { binaryInfo, globalStorage, ffmpegDir, update, platform } = opts;

    await this.ensureDirectories(globalStorage, ffmpegDir);

    await this.installAsset(binaryInfo.primary, {
      globalStorage,
      ffmpegDir,
      platform,
      update,
      progress: binaryInfo.probe
        ? { start: 5, downloadEnd: 55, verifyEnd: 65 }
        : { start: 5, downloadEnd: 80, verifyEnd: 90 }
    });

    if (binaryInfo.probe) {
      await this.installAsset(binaryInfo.probe, {
        globalStorage,
        ffmpegDir,
        platform,
        update,
        progress: { start: 65, downloadEnd: 85, verifyEnd: 95 }
      });
    }

    this.ffmpegPath = path.join(ffmpegDir, this.getExecutableName());
    this.ffprobePath = path.join(ffmpegDir, this.getProbeExecutableName());
  }

  private async installAsset(asset: FfmpegAsset, opts: {
    globalStorage: string;
    ffmpegDir: string;
    platform: NodeJS.Platform;
    update: (percent: number, message?: string) => void;
    progress: InstallProgressRange;
  }): Promise<void> {
    const archivePath = path.join(opts.globalStorage, asset.filename);
    const executableNames = [asset.executableName, ...(asset.extraExecutables ?? [])];

    opts.update(opts.progress.start, `Downloading ${asset.executableName}...`);
    await this.downloadArchive(asset.url, archivePath, (percent, message) => {
      const mapped = opts.progress.start + ((opts.progress.downloadEnd - opts.progress.start) * (percent / 100));
      opts.update(mapped, message);
    });

    opts.update(opts.progress.downloadEnd, `Verifying ${asset.filename}...`);
    await this.verifyArchiveChecksum(asset, archivePath);

    opts.update(opts.progress.verifyEnd, `Extracting ${asset.filename}...`);
    await this.extractArchive(archivePath, opts.ffmpegDir, asset.extractPath, executableNames);

    for (const executableName of executableNames) {
      await this.makeExecutableAndVerify(opts.ffmpegDir, executableName, opts.platform);
    }

    if (asset.binarySha256) {
      await this.verifyBinaryChecksum(path.join(opts.ffmpegDir, asset.executableName), asset.binarySha256);
    }

    try {
      await fs.promises.unlink(archivePath);
    } catch {
      // Archive cleanup is best-effort.
    }
  }

  private async downloadArchive(url: string, dest: string, update: (percent: number, message?: string) => void): Promise<void> {
    await this.downloadWithProgress(url, dest, update);
  }

  private async downloadWithProgress(
    url: string,
    dest: string,
    update: (percent: number, message?: string) => void,
    redirects: number = 0
  ): Promise<void> {
    if (redirects > 5) {
      throw new Error(`Too many redirects while downloading ${url}`);
    }

    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {};
      headers['User-Agent'] = 'VS-Code-MagicVid2Gif';
      const request = https.get(url, { headers }, (response) => {
        if (this.isRedirect(response.statusCode) && response.headers.location) {
          response.resume();
          this.downloadWithProgress(new URL(response.headers.location, url).toString(), dest, update, redirects + 1)
            .then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode} while downloading ${url}`));
          return;
        }

        const total = Number.parseInt(String(response.headers['content-length'] ?? '0'), 10);
        let downloaded = 0;
        let lastPercent = 0;
        const file = fs.createWriteStream(dest, { flags: 'w' });

        response.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (total > 0) {
            const percent = Math.floor((downloaded / total) * 100);
            if (percent > lastPercent) {
              lastPercent = percent;
              update(percent, `Downloading... ${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB`);
            }
          }
        });

        response.pipe(file);
        file.on('finish', () => {
          file.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            update(100, 'Download complete.');
            resolve();
          });
        });
        file.on('error', reject);
      });

      request.setTimeout(120_000, () => {
        request.destroy(new Error(`Timed out while downloading ${url}`));
      });
      request.on('error', reject);
    });
  }

  private async verifyArchiveChecksum(asset: FfmpegAsset, archivePath: string): Promise<void> {
    const expectedSha = asset.archiveSha256 ?? null;
    if (!expectedSha) {
      if (asset.binarySha256) {
        return;
      }
      throw new Error(`No SHA-256 checksum configured for ${asset.filename}`);
    }

    const actualSha = await this.computeFileSha256(archivePath);
    if (actualSha !== expectedSha) {
      throw new Error(`Checksum mismatch for ${asset.filename}: expected ${expectedSha}, got ${actualSha}`);
    }
  }

  private async verifyBinaryChecksum(binaryPath: string, expectedSha: string): Promise<void> {
    const actualSha = await this.computeFileSha256(binaryPath);
    if (actualSha !== expectedSha) {
      throw new Error(`Checksum mismatch for ${path.basename(binaryPath)}: expected ${expectedSha}, got ${actualSha}`);
    }
  }

  private isRedirect(statusCode: number | undefined): boolean {
    return statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308;
  }

  private async extractArchive(archive: string, dest: string, extractSubPath: string, executableNames?: string[]): Promise<void> {
    if (archive.endsWith('.zip')) {
      try {
        await fs.createReadStream(archive)
          .pipe(unzipper.Extract({ path: dest }))
          .promise();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Extraction failed: unable to extract ZIP archive. ${message}`);
      }
    } else if (archive.endsWith('.tar.xz')) {
      try {
        await execFileAsync('tar', ['-xf', archive, '-C', dest]);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Extraction failed: tar is not available or the archive is corrupted. ${message}`);
      }
    } else {
      throw new Error(`Unsupported archive format: ${archive}`);
    }

    for (const executableName of executableNames ?? [this.getExecutableName()]) {
      this.copyExtractedExecutable(dest, extractSubPath, executableName);
    }
  }

  private copyExtractedExecutable(dest: string, extractSubPath: string, executableName: string): void {
    const finalBin = path.join(dest, executableName);
    const explicitPath = extractSubPath ? path.join(dest, extractSubPath, executableName) : finalBin;

    if (fs.existsSync(explicitPath) && explicitPath !== finalBin) {
      fs.copyFileSync(explicitPath, finalBin);
      return;
    }

    if (fs.existsSync(finalBin)) {
      return;
    }

    const discoveredPath = this.findFileByName(dest, executableName);
    if (discoveredPath) {
      fs.copyFileSync(discoveredPath, finalBin);
      return;
    }

    throw new Error(`${executableName} not found in extracted archive.`);
  }

  private findFileByName(root: string, filename: string): string | null {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(root, entry.name);
      if (entry.isFile() && entry.name === filename) {
        return entryPath;
      }

      if (entry.isDirectory()) {
        const found = this.findFileByName(entryPath, filename);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  private async makeExecutableAndVerify(ffmpegDir: string, executableName: string, platform: NodeJS.Platform): Promise<void> {
    const finalPath = path.join(ffmpegDir, executableName);
    if (platform !== 'win32') {
      await fs.promises.chmod(finalPath, 0o755);
      if (platform === 'darwin') {
        try {
          await execFileAsync('xattr', ['-dr', 'com.apple.quarantine', finalPath]);
        } catch {
          // xattr is not always present in minimal test environments.
        }
      }
    }

    await execFileAsync(finalPath, ['-version']);
  }

  private async verifyCachedPath(binaryPath: string | null, binaryName: 'ffmpeg' | 'ffprobe'): Promise<string | null> {
    if (!binaryPath || !fs.existsSync(binaryPath)) {
      return null;
    }

    try {
      await execFileAsync(binaryPath, ['-version']);
      return binaryPath;
    } catch {
      this.clearCachedPath(binaryName);
      return null;
    }
  }

  private async verifyBundledPath(executableName: string, binaryName: 'ffmpeg' | 'ffprobe'): Promise<string | null> {
    const storagePath = this.workspace.storagePath();
    if (!storagePath) {
      return null;
    }

    return this.verifyCachedPath(path.join(storagePath, 'ffmpeg', executableName), binaryName);
  }

  private clearCachedPath(binaryName: 'ffmpeg' | 'ffprobe'): void {
    if (binaryName === 'ffmpeg') {
      this.ffmpegPath = null;
    } else {
      this.ffprobePath = null;
    }
  }

  private async resolveSystemBinary(binaryName: 'ffmpeg' | 'ffprobe'): Promise<string | null> {
    try {
      if (os.platform() === 'win32') {
        const result = await execFileAsync('where', [binaryName]);
        return this.verifySystemPath(this.commandStdout(result), binaryName);
      }

      const result = await execAsync(`command -v ${binaryName}`);
      return this.verifySystemPath(this.commandStdout(result), binaryName);
    } catch {
      return null;
    }
  }

  private commandStdout(result: unknown): string {
    if (typeof result === 'string' || Buffer.isBuffer(result)) {
      return String(result);
    }

    if (result && typeof result === 'object' && 'stdout' in result) {
      return String((result as { stdout?: string | Buffer }).stdout ?? '');
    }

    return '';
  }

  private async verifySystemPath(stdout: string, binaryName: 'ffmpeg' | 'ffprobe'): Promise<string | null> {
    const firstLine = (stdout || '').split(/[\r\n]+/).find(Boolean);
    if (!firstLine) {
      return null;
    }

    const binaryPath = firstLine.trim();
    try {
      await execFileAsync(binaryPath, ['-version']);
      return binaryPath;
    } catch {
      this.clearCachedPath(binaryName);
      return null;
    }
  }

  private async computeFileSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private getExecutableName(): string {
    return os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  }

  private getProbeExecutableName(): string {
    return os.platform() === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  }
}
