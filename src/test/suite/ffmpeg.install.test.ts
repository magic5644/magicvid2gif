import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { UiPort, SettingsPort, WorkspacePort } from '../../types/ports';
import { FfmpegManager } from '../../ffmpegManager';

const execAsync = promisify(exec);

/**
 * Build a tiny fake FFmpeg archive so we exercise the real install flow
 * (download → extract → chmod → -version).
 */
async function createFixtureArchive(tmpRoot: string): Promise<{ archivePath: string; executableName: string }> {
  const executableName = os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  const payloadRoot = path.join(tmpRoot, 'payload');
  fs.mkdirSync(payloadRoot, { recursive: true });

  const scriptPath = path.join(payloadRoot, executableName);
  const scriptContent = os.platform() === 'win32'
    ? '@echo off\r\necho ffmpeg version test-e2e\r\n'
    : '#!/bin/sh\necho "ffmpeg version test-e2e"\n';
  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

  // Put the binary inside a folder so --strip-components=1 works on Linux tarball
  const archiveWorkingRoot = path.join(tmpRoot, 'archive-src');
  const binDir = path.join(archiveWorkingRoot, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  fs.copyFileSync(scriptPath, path.join(binDir, executableName));

  if (os.platform() === 'linux') {
    const archivePath = path.join(tmpRoot, 'ffmpeg.tar.xz');
    await execAsync(`tar -C "${archiveWorkingRoot}" -cJf "${archivePath}" bin`);
    return { archivePath, executableName };
  }

  // macOS path (zip expected). Windows is skipped in the test.
  const archivePath = path.join(tmpRoot, 'ffmpeg.zip');
  await execAsync(`cd "${archiveWorkingRoot}" && zip -r "${archivePath}" bin`);
  return { archivePath, executableName };
}

suite('FFmpeg - real install E2E', () => {
  teardown(() => {
    sinon.restore();
  });

  test('downloads, extracts, makes executable and reports version', async function () {
    // Windows binaries are real EXEs; keeping the test focused on *nix keeps it stable.
    if (os.platform() === 'win32') {
      this.skip();
      return;
    }

    this.timeout(120_000);

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ffmpeg-e2e-'));

    // Activate extension and grab the singleton manager it uses
    const ext = vscode.extensions.getExtension('magic5644.magicvid2gif');
    if (!ext) { throw new Error('Extension not found'); }
    await ext.activate();
    const exported = ext.exports as { _getFfmpegManager?: () => FfmpegManager } | undefined;
    const fallbackUi: UiPort = {
      pick: async () => null,
      input: async () => null,
      info: async () => undefined,
      warn: async () => undefined,
      error: async () => undefined,
      withProgress: async <T>(_title: string, task: (update: (percent: number, msg?: string) => void) => Promise<T>): Promise<T> =>
        task(() => {})
    };
    const fallbackSettings: SettingsPort = { get: <T>(_key: string, fallback: T): T => fallback };
    const fallbackWorkspace: WorkspacePort = {
      storagePath: () => tempRoot,
      tmpPath: () => tempRoot,
      toFsPath: (u: string) => u
    };
    const manager = exported?._getFfmpegManager?.() ?? FfmpegManager.getInstance({
      ui: fallbackUi,
      settings: fallbackSettings,
      workspace: fallbackWorkspace
    });

    const managerInternals = manager as unknown as {
      ui: UiPort;
      workspace: WorkspacePort;
      isDownloading: boolean;
      ffmpegPath: string | null;
      installFfmpegDarwinArm: (ffmpegDir: string, archivePath: string, update: (p: number, m?: string) => void) => Promise<boolean>;
      resolveBinary: () => { url: string; filename: string; extractPath: string; executableName: string };
      downloadArchive: (url: string, dest: string, update: (p: number, m?: string) => void) => Promise<void>;
    };

    // Capture and replace dependencies so we can restore them after the test
    const originalWorkspace = managerInternals.workspace;
    const originalUi = managerInternals.ui;
    const originalIsDownloading = managerInternals.isDownloading;
    const originalFfmpegPath = managerInternals.ffmpegPath;
    managerInternals.workspace = { storagePath: () => tempRoot, tmpPath: () => tempRoot, toFsPath: (u: string) => u };

    // Build a tiny fixture archive to stand in for a real FFmpeg download
    const { archivePath, executableName } = await createFixtureArchive(tempRoot);

    const ffmpegDir = path.join(tempRoot, 'ffmpeg');
    const ui: UiPort = {
      pick: async () => null,
      input: async () => null,
      info: sinon.stub().resolves('Yes'),
      warn: sinon.stub().resolves('Continue'),
      error: sinon.stub().resolves(undefined),
      withProgress: async <T>(_title: string, task: (update: (percent: number, msg?: string) => void) => Promise<T>): Promise<T> =>
        task(() => {})
    };

    try {
      // Wire the manager to our fixture and temp UI
      managerInternals.ui = ui;
      managerInternals.isDownloading = false;
      managerInternals.ffmpegPath = null;

      sinon.stub(managerInternals, 'installFfmpegDarwinArm').callsFake(async () => false); // avoid Homebrew path in tests
      sinon.stub(managerInternals, 'resolveBinary').callsFake(() => ({
        url: 'local-fixture',
        filename: path.basename(archivePath),
        extractPath: os.platform() === 'linux' ? '' : 'bin',
        executableName
      }));

      // When asked to download, copy our prebuilt archive instead of hitting the network
      sinon.stub(managerInternals, 'downloadArchive').callsFake(async (_url: string, dest: string, update: (p: number, m?: string) => void) => {
        fs.copyFileSync(archivePath, dest);
        update?.(80, 'fixture copied');
      });

      // Kick the real install flow (uses the stubs above to stay offline)
      await manager.installFfmpeg(true);

      // Spy on the user-facing VS Code message so we know the command finished
      const infoMessage = sinon.stub(vscode.window, 'showInformationMessage');

      // Also exercise the contributed command (should be a no-op if already installed)
      await vscode.commands.executeCommand('magicvid2gif.installFfmpeg');

      // Validate that the binary is present and executable
      const installedPath = path.join(ffmpegDir, executableName);
      assert.ok(fs.existsSync(installedPath), 'ffmpeg binary should be extracted to storage');

      const { stdout } = await execAsync(`"${installedPath}" -version`);
      assert.match(stdout, /test-e2e/, 'ffmpeg -version should come from the fake binary');

      const version = await manager.getVersion();
      assert.strictEqual(version, 'test-e2e');

      // Command should have surfaced success to the user
      sinon.assert.called(infoMessage);
    } finally {
      managerInternals.workspace = originalWorkspace;
      managerInternals.ui = originalUi;
      managerInternals.isDownloading = originalIsDownloading;
      managerInternals.ffmpegPath = originalFfmpegPath;
      try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch { /* ignore cleanup errors */ }
    }
  });
});
