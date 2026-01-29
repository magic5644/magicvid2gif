import { exec, execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as https from 'node:https';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { UiPort, SettingsPort, WorkspacePort } from './types/ports';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

interface FfmpegBinary {
  url: string;
  filename: string;
  extractPath: string;
  executableName: string;
}

export class FfmpegManager {
  private static instance: FfmpegManager;
  private readonly ui: UiPort;
  private readonly settings: SettingsPort;
  private readonly workspace: WorkspacePort;
  private ffmpegPath: string | null = null;
  private isDownloading: boolean = false;

  // URLs des builds statiques fiables
  private readonly downloadUrls: Record<string, Record<string, FfmpegBinary>> = {
    win32: {
      x64: {
        url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
        filename: 'ffmpeg.zip',
        extractPath: 'ffmpeg-master-latest-win64-gpl/bin',
        executableName: 'ffmpeg.exe'
      },
      ia32: {
        url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win32-gpl.zip',
        filename: 'ffmpeg.zip',
        extractPath: 'ffmpeg-master-latest-win32-gpl/bin',
        executableName: 'ffmpeg.exe'
      }
    },
    darwin: {
      x64: {
        url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
        filename: 'ffmpeg.zip',
        extractPath: '',
        executableName: 'ffmpeg'
      },
      arm64: {
        url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
        filename: 'ffmpeg.zip',
        extractPath: '',
        executableName: 'ffmpeg'
      }
    },
    linux: {
      x64: {
        url: 'https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz',
        filename: 'ffmpeg.tar.xz',
        extractPath: '',
        executableName: 'ffmpeg'
      },
      arm64: {
        url: 'https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-arm64-static.tar.xz',
        filename: 'ffmpeg.tar.xz',
        extractPath: '',
        executableName: 'ffmpeg'
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

  /**
   * Get FFmpeg path (system or bundled)
   */
  public async getFfmpegPath(): Promise<string | null> {
    // Check if we already have a cached path
    if (this.ffmpegPath && fs.existsSync(this.ffmpegPath)) {
      return this.ffmpegPath;
    }

    // Check the extension's global storage (if available)
    const globalStorage = this.workspace.storagePath();
    if (globalStorage) {
      const bundledPath = path.join(globalStorage, 'ffmpeg', this.getExecutableName());

      if (fs.existsSync(bundledPath)) {
        // Verify it is executable
        try {
          await execFileAsync(bundledPath, ['-version']);
          this.ffmpegPath = bundledPath;
          return bundledPath;
        } catch {
          // Corrupted, re-download
        }
      }
    }

    // Check system PATH and resolve absolute executable path
    try {
      const systemPath = await this.resolveSystemFfmpeg();
      if (systemPath) {
        this.ffmpegPath = systemPath;
        return systemPath;
      }

      // Fallback: if ffmpeg responds on PATH, use 'ffmpeg' (best-effort)
      const { stdout } = await execAsync('ffmpeg -version');
      if (stdout?.includes('ffmpeg version')) {
        this.ffmpegPath = 'ffmpeg';
        return 'ffmpeg';
      }
    } catch {
      // Not on system
    }

    return null;
  }

  /**
   * Install FFmpeg automatically
   */
  public async installFfmpeg(force: boolean = false): Promise<boolean> {
    if (this.isDownloading) {
      this.ui.info('FFmpeg download already in progress...');
      return false;
    }

    const platform = os.platform();
    const arch = os.arch();
    const binaryInfo = this.resolveBinary(platform, arch);
    if (!binaryInfo) {return false;}

    const { globalStorage, ffmpegDir, archivePath, isDarwinArm } = this.computePaths(binaryInfo);

    if (!force && this.existingBinaryExists(ffmpegDir, binaryInfo.executableName)) {
      this.ui.info('FFmpeg is already installed.');
      return true;
    }

    this.isDownloading = true;

    try {
      await this.ui.withProgress('Downloading FFmpeg', async (update) => {
        await this.performInstallSteps({ binaryInfo, globalStorage, ffmpegDir, archivePath, update, isDarwinArm, platform });
      });

      this.ui.info('✅ FFmpeg installed successfully!');
      return true;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`❌ FFmpeg install error: ${message}`);
      return false;
    } finally {
      this.isDownloading = false;
    }
  }

  private resolveBinary(platform: NodeJS.Platform, arch: string): FfmpegBinary | null {
    let binaryInfo = this.downloadUrls[platform]?.[arch];
    if (!binaryInfo) {
      // Try common fallbacks for arm variants
      if (arch?.startsWith('arm')) {
        binaryInfo = this.downloadUrls[platform]?.['arm64'];
      }
    }

    if (!binaryInfo) {
      this.ui.error(`Unsupported platform: ${platform}-${arch}. Please install FFmpeg manually.`);
      return null;
    }
    return binaryInfo;
  }

  private computePaths(binaryInfo: FfmpegBinary): { globalStorage: string; ffmpegDir: string; archivePath: string; isDarwinArm: boolean } {
    const platform = os.platform();
    const arch = os.arch();
    // Use globalStorage when available, otherwise fallback to OS temp dir
    const globalStorage = this.workspace.storagePath() ?? os.tmpdir();
    const ffmpegDir = path.join(globalStorage, 'ffmpeg');
    const archivePath = path.join(globalStorage, binaryInfo.filename);
    const isDarwinArm = (platform === 'darwin' && arch === 'arm64');
    return { globalStorage, ffmpegDir, archivePath, isDarwinArm };
  }

  private existingBinaryExists(ffmpegDir: string, executableName: string): boolean {
    return fs.existsSync(path.join(ffmpegDir, executableName));
  }

  private async ensureDirectories(globalStorage: string, ffmpegDir: string): Promise<void> {
    if (!fs.existsSync(globalStorage)) {
      fs.mkdirSync(globalStorage, { recursive: true });
    }
    if (!fs.existsSync(ffmpegDir)) {
      fs.mkdirSync(ffmpegDir, { recursive: true });
    }
  }

  /**
   * Ensure FFmpeg is available, install if needed
   */
  public async ensureFfmpeg(): Promise<string | null> {
    const existingPath = await this.getFfmpegPath();
    if (existingPath) {
      return existingPath;
    }

    const autoInstall = this.settings.get<boolean>('autoInstallFfmpeg', true);

    if (autoInstall) {
      const choice = await this.ui.info(
        'FFmpeg is not installed. Download it automatically (~40-80MB)?',
        ['Yes', 'No']
      );

      if (choice === 'Yes') {
        const installed = await this.installFfmpeg();
        return installed ? await this.getFfmpegPath() : null;
      }
    } else {
      await this.ui.error(
        'FFmpeg is required. Install it or enable automatic installation in settings.',
        ['Ok']
      );
    }

    return null;
  }

  private async downloadWithProgress(
    url: string, 
    dest: string, 
    update: (percent: number, message?: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);

      const headers: Record<string, string> = {};
      headers['User-Agent'] = 'VS-Code-MagicVid2Gif';
      const request = https.get(url, { 
        headers
      }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          if (response.headers.location) {
            this.downloadWithProgress(response.headers.location, dest, update)
              .then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const total = Number.parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        let lastPercent = 0;

        response.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (total > 0) {
            const percent = Math.floor((downloaded / total) * 80);
            if (percent > lastPercent) {
              update(percent - lastPercent, `Downloading... ${(downloaded/1024/1024).toFixed(1)}MB / ${(total/1024/1024).toFixed(1)}MB`);
              lastPercent = percent;
            }
          }
        });

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      });

      request.on('error', reject);
    });
  }

  private async downloadArchive(url: string, dest: string, update: (percent: number, message?: string) => void): Promise<void> {
    await this.downloadWithProgress(url, dest, update);
  }

  private async extractAndCleanup(archivePath: string, ffmpegDir: string, extractPath: string): Promise<void> {
    // Extract
    await this.extractArchive(archivePath, ffmpegDir, extractPath);

    // Cleanup
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }
  }

  private async makeExecutableAndVerify(ffmpegDir: string, executableName: string, platform: string): Promise<void> {
    // Make executable on Unix
    if (platform !== 'win32') {
      const execPath = path.join(ffmpegDir, executableName);
      fs.chmodSync(execPath, 0o755);
    }

    // Verify installation
    const finalPath = path.join(ffmpegDir, executableName);
    await execFileAsync(finalPath, ['-version']);

    this.ffmpegPath = finalPath;
  }

  // macOS Apple Silicon specific install flow: prefer Homebrew, otherwise fetch osxexperts ARM build and verify checksum
  private async installFfmpegDarwinArm(ffmpegDir: string, archivePath: string, update: (percent: number, message?: string) => void): Promise<boolean> {
    const brewAvailable = await this.isCommandAvailable('brew');

    if (brewAvailable) {
      const done = await this.tryUseOrInstallBrew(update);
      if (done) {return true;}
    } else {
      const decision = await this.promptInstallBrewOrFallback();
      if (decision === 'cancel') {return false;}
      if (decision === 'brew') {
        const installed = await this.installBrewAndFfmpeg(update);
        if (installed) {return true;}
      }
      // otherwise continue to fallback
    }

    return this.downloadOsxExpertsFallback(ffmpegDir, update);
  }

  private async isCommandAvailable(cmd: string): Promise<boolean> {
    try {
      await execAsync(`${cmd} --version`);
      return true;
    } catch {
      return false;
    }
  }

  private async resolveSystemFfmpeg(): Promise<string | null> {
    const platform = os.platform();
    try {
      if (platform === 'win32') {
        // Use where on Windows to get absolute path
        const { stdout } = await execAsync('where ffmpeg');
        const firstLine = (stdout || '').split(/[\r\n]+/).find(Boolean);
        if (firstLine) {
          // Verify the binary
          try {
            await execFileAsync(firstLine.trim(), ['-version']);
            return firstLine.trim();
          } catch {
            // verification failed, continue
          }
        }
      } else {
        // POSIX: prefer command -v for builtin-friendly resolution
        try {
          const { stdout } = await execAsync('command -v ffmpeg');
          const cmdPath = (stdout || '').split(/\r?\n/).find(Boolean);
          if (cmdPath) {
            try {
              await execFileAsync(cmdPath.trim(), ['-version']);
              return cmdPath.trim();
            } catch {
              // verification failed, continue
            }
          }
        } catch {
          // command -v not available or ffmpeg not present
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  private async tryUseOrInstallBrew(update: (percent: number, message?: string) => void): Promise<boolean> {
    try {
      await execAsync('brew list ffmpeg');
      const { stdout } = await execAsync('which ffmpeg');
      this.ffmpegPath = stdout.trim() || 'ffmpeg';
      return true;
    } catch {
      const choice = await this.ui.info('Homebrew detected. Install FFmpeg via Homebrew (recommended)?', ['Install now', 'Cancel']);
      if (choice === 'Install now') {
        update(5, 'Installation via Homebrew...');
        try {
          await execAsync('brew install ffmpeg');
          const { stdout } = await execAsync('which ffmpeg');
          this.ffmpegPath = stdout.trim() || 'ffmpeg';
          return true;
        } catch {
          this.ui.error('Homebrew installation failed. Falling back.');
        }
      }
      return false;
    }
  }

  private async promptInstallBrewOrFallback(): Promise<'brew' | 'fallback' | 'cancel'> {
    const installBrewChoice = await this.ui.info(
      'Homebrew not detected. Install Homebrew (recommended)?',
      ['Install Homebrew', 'Download Apple Silicon binary', 'Cancel']
    );
    if (installBrewChoice === 'Install Homebrew') {return 'brew';}
    if (installBrewChoice === 'Download Apple Silicon binary') {return 'fallback';}
    return 'cancel';
  }

  private async installBrewAndFfmpeg(update: (percent: number, message?: string) => void): Promise<boolean> {
    const consent = await this.ui.warn(
      'Installing Homebrew will run a remote script and may prompt for your password. Continue?',
      ['Install', 'Cancel']
    );
    if (consent !== 'Install') {return false;}

    try {
      update(5, 'Installation Homebrew...');
      await execAsync('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
      await execAsync('brew install ffmpeg');
      const { stdout } = await execAsync('which ffmpeg');
      this.ffmpegPath = stdout.trim() || 'ffmpeg';
      return true;
    } catch {
      this.ui.error('Homebrew or FFmpeg installation failed. Falling back.');
      return false;
    }
  }

  private async downloadOsxExpertsFallback(ffmpegDir: string, update: (percent: number, message?: string) => void): Promise<boolean> {
    const osxUrl = 'https://www.osxexperts.net/ffmpeg80arm.zip';
    const osxArchive = path.join(this.workspace.storagePath() ?? os.tmpdir(), 'ffmpeg_osx_arm.zip');

    try {
      update(5, 'Downloading Apple Silicon binary (osxexperts)...');
      await this.downloadWithProgress(osxUrl, osxArchive, update);

      const ok = await this.verifyOsxArchive(osxArchive);
      if (!ok) { return false; }

      update(90, 'Extraction...');
      const installed = await this.installOsxArchive(osxArchive, ffmpegDir);
      return installed;
    } catch (err) {
      console.error('Fallback Apple Silicon install error', err);
      return false;
    }
  }

  private async verifyOsxArchive(osxArchive: string): Promise<boolean> {
    const expectedSha = await this.safeFetchOsxChecksum();
    if (!expectedSha) { return true; }

    const actualSha = await this.computeFileSha256(osxArchive);
    if (expectedSha === actualSha) { return true; }

    const proceed = await this.ui.warn(
      `Checksum mismatch for Apple Silicon binary (expected ${expectedSha}, got ${actualSha}). Continue anyway?`,
      ['Continue', 'Cancel']
    );
    if (proceed !== 'Continue') {
      try { fs.unlinkSync(osxArchive); } catch { }
      return false;
    }
    return true;
  }

  private async installOsxArchive(osxArchive: string, ffmpegDir: string): Promise<boolean> {
    await this.extractArchive(osxArchive, ffmpegDir, '');

    const execPath = path.join(ffmpegDir, this.getExecutableName());
    if (!fs.existsSync(execPath)) { return false; }

    try { await execAsync(`xattr -dr com.apple.quarantine "${execPath}"`); } catch { }
    fs.chmodSync(execPath, 0o755);
    await execFileAsync(execPath, ['-version']);
    this.ffmpegPath = execPath;
    return true;
  }

  private async safeFetchOsxChecksum(): Promise<string | null> {
    try {
      return await this.fetchOsxExpertsChecksum();
    } catch {
      return null;
    }
  }

  private async fetchOsxExpertsChecksum(): Promise<string | null> {
    // Minimal fetch + regex to find SHA256 for ffmpeg80arm.zip on osxexperts
    return new Promise((resolve, reject) => {
      let data = '';
      https.get('https://www.osxexperts.net/', (res) => {
        res.on('data', (chunk) => data += chunk.toString());
        res.on('end', () => {
          const m = new RegExp(/Download ffmpeg 8.0 \(Apple Silicon\)[\s\S]*?SHA256 checksum of FFmpeg file\s*:\s*([a-f0-9]{64})/i).exec(data);
          if (m) {resolve(m[1]);} else {resolve(null);}
        });
      }).on('error', (err) => reject(err));
    });
  }

  private async computeFileSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = require('node:crypto').createHash('sha256');
      const rs = fs.createReadStream(filePath);
      rs.on('data', (chunk) => hash.update(chunk));
      rs.on('end', () => resolve(hash.digest('hex')));
      rs.on('error', (err) => reject(err));
    });
  }
  private async extractArchive(archive: string, dest: string, extractSubPath: string): Promise<void> {
    const platform = os.platform();

    if (archive.endsWith('.zip')) {
      // Use PowerShell on Windows, unzip on Unix
      try {
        if (platform === 'win32') {
          const psCommand = `Expand-Archive -Path '${archive}' -DestinationPath '${dest}' -Force`;
          await execAsync(`powershell.exe -Command "${psCommand}"`);
        } else {
          await execAsync(`unzip -o "${archive}" -d "${dest}"`);
        }
      } catch (err: any) {
        const errMsg = platform === 'win32'
          ? 'Extraction failed: PowerShell Expand-Archive failed. Ensure PowerShell is available and try again.'
          : 'Extraction failed: `unzip` is not available or failed. Install `unzip` and try again.';
        throw new Error(errMsg + (err?.message ? ` (${err.message})` : ''));
      }
    } else if (archive.endsWith('.tar.xz')) {
      try {
        await execAsync(`tar -xf "${archive}" -C "${dest}" --strip-components=1`);
      } catch (err: any) {
        throw new Error('Extraction failed: `tar` is not available or the archive is corrupted. Install `tar` and try again.' + (err?.message ? ` (${err.message})` : ''));
      }
    }

    // If the binary is in a subfolder
    if (extractSubPath) {
      const extractedBin = path.join(dest, extractSubPath, this.getExecutableName());
      const finalBin = path.join(dest, this.getExecutableName());
      if (fs.existsSync(extractedBin)) {
        fs.copyFileSync(extractedBin, finalBin);
      }
    }
  }

  private getExecutableName(): string {
    return os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  }

  private async performInstallSteps(opts: {
    binaryInfo: FfmpegBinary;
    globalStorage: string;
    ffmpegDir: string;
    archivePath: string;
    update: (percent: number, message?: string) => void;
    isDarwinArm: boolean;
    platform: string;
  }): Promise<void> {
    const { binaryInfo, globalStorage, ffmpegDir, archivePath, update, isDarwinArm, platform } = opts;

    await this.ensureDirectories(globalStorage, ffmpegDir);

    // Special case for Apple Silicon: try Homebrew or osxexperts fallback
    if (isDarwinArm) {
      const handled = await this.installFfmpegDarwinArm(ffmpegDir, archivePath, update);
      if (handled) {
        // already installed via Homebrew or downloaded & extracted by fallback
        return;
      }
    }

    await this.downloadArchive(binaryInfo.url, archivePath, update);

    await this.extractAndCleanup(archivePath, ffmpegDir, binaryInfo.extractPath);

    await this.makeExecutableAndVerify(ffmpegDir, binaryInfo.executableName, platform);
  }

  public async getVersion(): Promise<string> {
    const ffmpegPath = await this.getFfmpegPath();
    if (!ffmpegPath) {return 'Not installed';}

    try {
      const { stdout } = await execFileAsync(ffmpegPath, ['-version']);
      const match = /ffmpeg version ([^\s]+)/.exec(stdout);
      return match ? match[1] : 'Unknown';
    } catch {
      return 'Error';
    }
  }
}
