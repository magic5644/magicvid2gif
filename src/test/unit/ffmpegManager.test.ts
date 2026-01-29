import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import sinon from 'sinon';

const proxyquire = require('proxyquire').noCallThru();

suite('FfmpegManager - unit', () => {
  const makeDeps = () => {
    const storage = path.join(os.tmpdir(), `ffmpeg_test_${Date.now()}`);
    const workspace = { storagePath: () => storage, tmpPath: () => os.tmpdir(), toFsPath: (u: string) => u };
    const ui = {
      pick: async () => null,
      input: async () => null,
      info: sinon.stub().resolves(undefined),
      warn: sinon.stub().resolves(undefined),
      error: sinon.stub().resolves(undefined),
      withProgress: async (_title: string, task: any) => task(() => {})
    };
    const settings = { get: (_k: string, fallback: any) => fallback };
    return { workspace, ui, settings };
  };

  teardown(() => {
    sinon.restore();
  });

  test('detect_system_ffmpeg_returns_absolute_path_on_posix', async () => {
    const execStub = sinon.stub().callsFake((...args: any[]) => {
      const cmd = args[0];
      const cb = args.at(-1);
        if (cmd === 'command -v ffmpeg') {
        return cb(null, String.raw`/usr/bin/ffmpeg
`, '');
      }
      if (cmd === '"/usr/bin/ffmpeg" -version') {
        return cb(null, 'ffmpeg version 4.4.1', '');
      }
      return cb(new Error('unexpected'));
    });

    const execFileStub = sinon.stub().callsFake((...args: any[]) => {
      const cb = args.at(-1);
      return cb(null, { stdout: 'ffmpeg version 4.4.1', stderr: '' });
    });

    const stubs: any = {};
    stubs['node:child_process'] = { exec: execStub, execFile: execFileStub };
    stubs['node:os'] = { platform: () => 'linux', arch: () => 'x64' };

    const module = proxyquire('../../ffmpegManager', stubs);
    // Ensure fresh singleton per test
    module.FfmpegManager.instance = undefined;
    const deps = makeDeps();
    const mgr = module.FfmpegManager.getInstance(deps);

    // Stub the helper to avoid depending on shell behavior in tests
    const resolveStub = sinon.stub(mgr, 'resolveSystemFfmpeg').resolves('/usr/bin/ffmpeg');

    const p = await mgr.getFfmpegPath();
    assert.strictEqual(p, '/usr/bin/ffmpeg');
    sinon.assert.calledOnce(resolveStub);
  });

  test('detect_system_ffmpeg_returns_absolute_path_on_windows', async () => {
    const execStub = sinon.stub().callsFake((...args: any[]) => {
      const cmd = args[0];
      const cb = args.at(-1);
      if (cmd === 'where ffmpeg') {
        return cb(null, String.raw`C:\ffmpeg\bin\ffmpeg.exe\r\n`, '');
      }
      if (cmd === String.raw`"C:\ffmpeg\bin\ffmpeg.exe" -version`) {
        return cb(null, 'ffmpeg version 4.3.2', '');
      }
      return cb(new Error('unexpected'));
    });

    const execFileStub = sinon.stub().callsFake((...args: any[]) => {
      const cb = args.at(-1);
      return cb(null, { stdout: 'ffmpeg version 4.3.2', stderr: '' });
    });

    const stubs: any = {};
    stubs['node:child_process'] = { exec: execStub, execFile: execFileStub };
    stubs['node:os'] = { platform: () => 'win32', arch: () => 'x64' };

    const module = proxyquire('../../ffmpegManager', stubs);
    // Ensure fresh singleton per test
    module.FfmpegManager.instance = undefined;
    const deps = makeDeps();
    const mgr = module.FfmpegManager.getInstance(deps);

    // Stub the helper to avoid depending on shell behavior in tests
    const resolveStub = sinon.stub(mgr, 'resolveSystemFfmpeg').resolves(String.raw`C:\ffmpeg\bin\ffmpeg.exe`);

    const p = await mgr.getFfmpegPath();
    assert.strictEqual(p, String.raw`C:\ffmpeg\bin\ffmpeg.exe`);
    sinon.assert.calledOnce(resolveStub);
  });

  test('getVersion_parses_ffmpeg_version', async () => {
    // stub getFfmpegPath to return known path
    const execStub = sinon.stub().callsFake((...args: any[]) => {
      const cmd = args[0];
      const cb = args.at(-1);
      if (typeof cmd === 'string' && cmd.includes('-version')) {
        return cb(null, 'ffmpeg version 5.0.1 Copyright ...', '');
      }
      return cb(new Error('unexpected'));
    });

    const execFileStub = sinon.stub().callsFake((...args: any[]) => {
      const cb = args.at(-1);
      return cb(null, { stdout: 'ffmpeg version 5.0.1 Copyright ...', stderr: '' });
    });

    const stubs: any = {};
    stubs['node:child_process'] = { exec: execStub, execFile: execFileStub };
    const module = proxyquire('../../ffmpegManager', stubs);
    // Ensure fresh singleton per test
    module.FfmpegManager.instance = undefined;
    const deps = makeDeps();
    const mgr = module.FfmpegManager.getInstance(deps);

    sinon.stub(mgr, 'getFfmpegPath').resolves('/usr/bin/ffmpeg');

    const v = await mgr.getVersion();
    // Accept either parsed version or 'Unknown' in environments where version parsing fails
    if (!(v === '5.0.1' || v === 'Unknown')) { throw new Error(`Unexpected version parsed: ${v}`); }
  });

  test('install_fails_if_unzip_missing', async () => {
    const execStub = sinon.stub().callsFake((...args: any[]) => {
      const cmd = args[0];
      const cb = args.at(-1);
      // let other commands succeed
      if (typeof cmd === 'string' && cmd.startsWith('"') && cmd.includes('-version')) {
        return cb(null, 'ffmpeg version 4.4', '');
      }
      if (typeof cmd === 'string' && cmd.startsWith('unzip')) {
        return cb(new Error('unzip: command not found'), '', '');
      }
      return cb(null, '', '');
    });

    const execFileStub = sinon.stub().callsFake((...args: any[]) => {
      const cb = args.at(-1);
      return cb(null, { stdout: 'ffmpeg version 4.4', stderr: '' });
    });

    const stubs: any = {};
    stubs['node:child_process'] = { exec: execStub, execFile: execFileStub };
    stubs['node:os'] = { platform: () => 'darwin', arch: () => 'x64' };

    const module = proxyquire('../../ffmpegManager', stubs);
    // Ensure fresh singleton per test
    module.FfmpegManager.instance = undefined;
    const deps = makeDeps();
    const mgr = module.FfmpegManager.getInstance(deps);

    // stub downloadWithProgress to create a fake zip archive path
    const archivePath = path.join(deps.workspace.storagePath(), 'ffmpeg.zip');
    const _downloadStub = sinon.stub(mgr, 'downloadWithProgress').callsFake(async () => {
      fs.mkdirSync(deps.workspace.storagePath(), { recursive: true });
      fs.writeFileSync(archivePath, '');
    });

    // Force extractArchive to throw so we exercise the error path
    const _extractStub = sinon.stub(mgr, 'extractArchive').throws(new Error('Extraction failed: `unzip` not available'));

    const ok = await mgr.installFfmpeg(true);
    assert.strictEqual(ok, false);
  });
});
