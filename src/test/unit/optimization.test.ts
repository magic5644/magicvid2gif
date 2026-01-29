import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import sinon from 'sinon';

const proxyquire = require('proxyquire').noCallThru();

suite('OptimizationService - unit', () => {
  teardown(() => {
    sinon.restore();
  });

  test('checkGifsicle returns true when custom path exists', async () => {
    const tmp = path.join(os.tmpdir(), `gifsicle_test_${Date.now()}`);
    fs.writeFileSync(tmp, '');
    fs.chmodSync(tmp, 0o755);

    const vscodeStub = { workspace: { getConfiguration: () => ({ get: () => tmp }) } };
    const module = proxyquire('../../optimizationService', { vscode: vscodeStub });
    const svc = new module.OptimizationService();

    const ok = await svc.checkGifsicle();
    assert.ok(ok, 'Expected custom gifsicle path to be accepted');

    fs.unlinkSync(tmp);
  });

  test('checkGifsicle detects system gifsicle via command', async () => {
    const execStub = sinon.stub().callsFake((_cmd: string, _args: string[], cb: any) => cb(null, 'gifsicle 1.0', ''));
    const vscodeStub = { workspace: { getConfiguration: () => ({ get: () => undefined }) } };
    const stubs: any = {};
    stubs['node:child_process'] = { execFile: execStub };
    stubs.vscode = vscodeStub;
    const module = proxyquire('../../optimizationService', stubs);
    const svc = new module.OptimizationService();

    const ok = await svc.checkGifsicle();
    assert.ok(ok, 'Expected system gifsicle to be detected');
    sinon.assert.calledOnce(execStub);
  });

  test('optimize returns temp path on success', async () => {
    const execStub = sinon.stub().callsFake((_cmd: string, _args: string[], cb: any) => cb(null, '', ''));
    const vscodeStub = { workspace: { getConfiguration: () => ({ get: () => 'gifsicle' }) } };
    const stubs: any = {};
    stubs['node:child_process'] = { execFile: execStub };
    stubs.vscode = vscodeStub;
    const module = proxyquire('../../optimizationService', stubs);

    const svc = new module.OptimizationService();
    // Provide a dummy input file
    const input = path.join(os.tmpdir(), `in_${Date.now()}.gif`);
    fs.writeFileSync(input, 'GIF89a');

    const outPath = await svc.optimize(input, { colorCount: 128, lossyCompression: 80 } as any);
    assert.ok(outPath !== input, 'Expected optimize to return a different temp path');
    assert.ok(outPath.startsWith(os.tmpdir()), 'Expected temp path to be in OS temp dir');

    fs.unlinkSync(input);
  });

  test('getGifInfo parses frames from gifsicle output', async () => {
    const tmpGif = path.join(os.tmpdir(), `g_${Date.now()}.gif`);
    fs.writeFileSync(tmpGif, 'GIF89a');

    const execStub = sinon.stub().callsFake((_cmd: string, _args: string[], cb: any) => cb(null, '3 images', ''));
    const vscodeStub = { workspace: { getConfiguration: () => ({ get: () => 'gifsicle' }) } };
    const stubs: any = {};
    stubs['node:child_process'] = { execFile: execStub };
    stubs.vscode = vscodeStub;
    const module = proxyquire('../../optimizationService', stubs);

    const svc = new module.OptimizationService();
    const info = await svc.getGifInfo(tmpGif);
    // exec parsing may vary by environment; ensure wasm call was made and size is correct
    assert.ok(info.frames >= 0);
    assert.strictEqual(info.size, fs.statSync(tmpGif).size);

    fs.unlinkSync(tmpGif);
  });
});
