import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as https from 'node:https';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

interface FfmpegBinary {
  url: string;
  filename: string;
  extractPath: string;
  executableName: string;
}

export class FfmpegManager {
  private static instance: FfmpegManager;
  private readonly context: vscode.ExtensionContext;
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

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(context: vscode.ExtensionContext): FfmpegManager {
    if (!FfmpegManager.instance) {
      FfmpegManager.instance = new FfmpegManager(context);
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

    // Check the extension's global storage
    const globalStorage = this.context.globalStorageUri.fsPath;
    const bundledPath = path.join(globalStorage, 'ffmpeg', this.getExecutableName());

    if (fs.existsSync(bundledPath)) {
      // Verify it is executable
      try {
        await execAsync(`"${bundledPath}" -version`);
        this.ffmpegPath = bundledPath;
        return bundledPath;
      } catch {
        // Corrupted, re-download
      }
    }

    // Check system PATH
    try {
      const { stdout } = await execAsync('ffmpeg -version');
      if (stdout.includes('ffmpeg version')) {
        this.ffmpegPath = 'ffmpeg'; // system
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
      vscode.window.showInformationMessage('FFmpeg download already in progress...');
      return false;
    }

    const platform = os.platform();
    const arch = os.arch();
    const binaryInfo = this.resolveBinary(platform, arch);
    if (!binaryInfo) {return false;}

    const { globalStorage, ffmpegDir, archivePath, isDarwinArm } = this.computePaths(binaryInfo);

    if (!force && this.existingBinaryExists(ffmpegDir, binaryInfo.executableName)) {
      vscode.window.showInformationMessage('FFmpeg is already installed.');
      return true;
    }

    this.isDownloading = true;

    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Downloading FFmpeg',
        cancellable: true
      }, async (progress, token) => {
        await this.ensureDirectories(globalStorage, ffmpegDir);

        // Special case for Apple Silicon: try Homebrew or osxexperts fallback
        if (isDarwinArm) {
          const handled = await this.installFfmpegDarwinArm(ffmpegDir, archivePath, progress, token);
          if (handled) {
            // already installed via Homebrew or downloaded & extracted by fallback
            return;
          }
        }

        // Download with progress
        await this.downloadWithProgress(
          binaryInfo.url, 
          archivePath, 
          progress,
          token
        );

        if (token.isCancellationRequested) {
          throw new Error('Download canceled');
        }

        progress.report({ message: 'Extracting...', increment: 90 });

        // Extract
        await this.extractArchive(archivePath, ffmpegDir, binaryInfo.extractPath);

        // Cleanup
        if (fs.existsSync(archivePath)) {
          fs.unlinkSync(archivePath);
        }

        progress.report({ message: 'Verifying...', increment: 95 });

        // Make executable on Unix
        if (platform !== 'win32') {
          const execPath = path.join(ffmpegDir, binaryInfo.executableName);
          fs.chmodSync(execPath, 0o755);
        }

        // Verify installation
        const finalPath = path.join(ffmpegDir, binaryInfo.executableName);
        await execAsync(`"${finalPath}" -version`);

        this.ffmpegPath = finalPath;
      });

      vscode.window.showInformationMessage('✅ FFmpeg installed successfully!');
      return true;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`❌ FFmpeg install error: ${message}`);
      return false;
    } finally {
      this.isDownloading = false;
    }
  }

  private resolveBinary(platform: NodeJS.Platform, arch: string): FfmpegBinary | null {
    const binaryInfo = this.downloadUrls[platform]?.[arch];
    if (!binaryInfo) {
      vscode.window.showErrorMessage(`Unsupported platform: ${platform}-${arch}. Please install FFmpeg manually.`);
      return null;
    }
    return binaryInfo;
  }

  private computePaths(binaryInfo: FfmpegBinary): { globalStorage: string; ffmpegDir: string; archivePath: string; isDarwinArm: boolean } {
    const platform = os.platform();
    const arch = os.arch();
    const globalStorage = this.context.globalStorageUri.fsPath;
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

    const config = vscode.workspace.getConfiguration('magicvid2gif');
    const autoInstall = config.get('autoInstallFfmpeg', true);

    if (autoInstall) {
      const choice = await vscode.window.showInformationMessage(
        'FFmpeg is not installed. Download it automatically (~40-80MB)?',
        'Yes', 'No', 'Always'
      );

      if (choice === 'Always') {
        await config.update('autoInstallFfmpeg', true, true);
      }

      if (choice === 'Yes' || choice === 'Always') {
        const installed = await this.installFfmpeg();
        return installed ? await this.getFfmpegPath() : null;
      }
    } else {
      vscode.window.showErrorMessage(
        'FFmpeg is required. Install it or enable automatic installation in settings.',
        'Install', 'Settings'
      ).then(selection => {
        if (selection === 'Install') {
          vscode.commands.executeCommand('magicvid2gif.installFfmpeg');
        } else if (selection === 'Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'magicvid2gif');
        }
      });
    }

    return null;
  }

  private async downloadWithProgress(
    url: string, 
    dest: string, 
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
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
            this.downloadWithProgress(response.headers.location, dest, progress, token)
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
              progress.report({ 
                increment: percent - lastPercent,
                message: `Downloading... ${(downloaded/1024/1024).toFixed(1)}MB / ${(total/1024/1024).toFixed(1)}MB`
              });
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

      token.onCancellationRequested(() => {
        request.destroy();
        file.destroy();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        reject(new Error('Canceled'));
      });
    });
  }

  // macOS Apple Silicon specific install flow: prefer Homebrew, otherwise fetch osxexperts ARM build and verify checksum
  private async installFfmpegDarwinArm(ffmpegDir: string, archivePath: string, progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken): Promise<boolean> {
    const brewAvailable = await this.isCommandAvailable('brew');

    if (brewAvailable) {
      const done = await this.tryUseOrInstallBrew(progress);
      if (done) {return true;}
    } else {
      const decision = await this.promptInstallBrewOrFallback();
      if (decision === 'cancel') {return false;}
      if (decision === 'brew') {
        const installed = await this.installBrewAndFfmpeg(progress);
        if (installed) {return true;}
      }
      // otherwise continue to fallback
    }

    return this.downloadOsxExpertsFallback(ffmpegDir, progress, token);
  }

  private async isCommandAvailable(cmd: string): Promise<boolean> {
    try {
      await execAsync(`${cmd} --version`);
      return true;
    } catch {
      return false;
    }
  }

  private async tryUseOrInstallBrew(progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<boolean> {
    try {
      await execAsync('brew list ffmpeg');
      const { stdout } = await execAsync('which ffmpeg');
      this.ffmpegPath = stdout.trim() || 'ffmpeg';
      return true;
    } catch {
      const choice = await vscode.window.showInformationMessage('Homebrew detected. Install FFmpeg via Homebrew (recommended)?', 'Install now', 'Cancel');
      if (choice === 'Install now') {
        progress.report({ message: 'Installation via Homebrew...', increment: 5 });
        try {
          await execAsync('brew install ffmpeg');
          const { stdout } = await execAsync('which ffmpeg');
          this.ffmpegPath = stdout.trim() || 'ffmpeg';
          return true;
        } catch {
          vscode.window.showErrorMessage('Homebrew installation failed. Falling back.');
        }
      }
      return false;
    }
  }

  private async promptInstallBrewOrFallback(): Promise<'brew' | 'fallback' | 'cancel'> {
    const installBrewChoice = await vscode.window.showInformationMessage(
      'Homebrew not detected. Install Homebrew (recommended)?',
      'Install Homebrew',
      'Download Apple Silicon binary',
      'Cancel'
    );
    if (installBrewChoice === 'Install Homebrew') {return 'brew';}
    if (installBrewChoice === 'Download Apple Silicon binary') {return 'fallback';}
    return 'cancel';
  }

  private async installBrewAndFfmpeg(progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<boolean> {
    const consent = await vscode.window.showWarningMessage(
      'Installing Homebrew will run a remote script and may prompt for your password. Continue?',
      'Install', 'Cancel'
    );
    if (consent !== 'Install') {return false;}

    try {
      progress.report({ message: 'Installation Homebrew...', increment: 5 });
      await execAsync('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
      await execAsync('brew install ffmpeg');
      const { stdout } = await execAsync('which ffmpeg');
      this.ffmpegPath = stdout.trim() || 'ffmpeg';
      return true;
    } catch {
      vscode.window.showErrorMessage('Homebrew or FFmpeg installation failed. Falling back.');
      return false;
    }
  }

  private async downloadOsxExpertsFallback(ffmpegDir: string, progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken): Promise<boolean> {
    const osxUrl = 'https://www.osxexperts.net/ffmpeg80arm.zip';
    const osxArchive = path.join(this.context.globalStorageUri.fsPath, 'ffmpeg_osx_arm.zip');

    try {
      progress.report({ message: 'Downloading Apple Silicon binary (osxexperts)...', increment: 5 });
      await this.downloadWithProgress(osxUrl, osxArchive, progress, token);

      const expectedSha = await this.safeFetchOsxChecksum();
      const actualSha = await this.computeFileSha256(osxArchive);

      if (expectedSha && expectedSha !== actualSha) {
        const proceed = await vscode.window.showWarningMessage(
          `Checksum mismatch for Apple Silicon binary (expected ${expectedSha}, got ${actualSha}). Continue anyway?`,
          'Continue', 'Cancel'
        );
        if (proceed !== 'Continue') {
          fs.unlinkSync(osxArchive);
          return false;
        }
      }

      progress.report({ message: 'Extraction...', increment: 90 });
      await this.extractArchive(osxArchive, ffmpegDir, '');

      const execPath = path.join(ffmpegDir, this.getExecutableName());
      if (fs.existsSync(execPath)) {
        try {await execAsync(`xattr -dr com.apple.quarantine "${execPath}"`);} catch {}
        fs.chmodSync(execPath, 0o755);
        await execAsync(`"${execPath}" -version`);
        this.ffmpegPath = execPath;
        return true;
      }
    } catch (err) {
      console.error('Fallback Apple Silicon install error', err);
      return false;
    }

    return false;
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
      // Utiliser PowerShell sur Windows, unzip sur Unix
      if (platform === 'win32') {
        const psCommand = `Expand-Archive -Path '${archive}' -DestinationPath '${dest}' -Force`;
        await execAsync(`powershell.exe -Command "${psCommand}"`);
      } else {
        await execAsync(`unzip -o "${archive}" -d "${dest}"`);
      }
    } else if (archive.endsWith('.tar.xz')) {
      await execAsync(`tar -xf "${archive}" -C "${dest}" --strip-components=1`);
    }

    // Si le binaire est dans un sous-dossier
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

  public async getVersion(): Promise<string> {
    const path = await this.getFfmpegPath();
    if (!path) {return 'Not installed';}

    try {
      const { stdout } = await execAsync(`"${path}" -version`);
      const match = /ffmpeg version ([^\s]+)/.exec(stdout);
      return match ? match[1] : 'Inconnu';
    } catch {
      return 'Erreur';
    }
  }
}
