import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createUniqueOutputPath, isValidResolution, validateConversionOptions } from '../../conversionOptions';
import { ConversionOptions } from '../../types';

suite('conversionOptions - unit', () => {
  const baseOptions: ConversionOptions = {
    startTime: 0,
    duration: 0,
    resolution: '1920:1080',
    fps: 30,
    colorCount: 128,
    optimizationLevel: 'balanced',
    dithering: true,
    lossyCompression: 80
  };

  test('createUniqueOutputPath preserves existing output files', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'magicvid-output-'));
    try {
      const inputPath = path.join(tempRoot, 'clip.mp4');
      const existingOutput = path.join(tempRoot, 'clip_magic.gif');
      fs.writeFileSync(inputPath, '');
      fs.writeFileSync(existingOutput, 'existing');

      assert.strictEqual(createUniqueOutputPath(inputPath), path.join(tempRoot, 'clip_magic_1.gif'));
      assert.strictEqual(fs.readFileSync(existingOutput, 'utf8'), 'existing');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('validates supported resolution formats', () => {
    assert.strictEqual(isValidResolution('original'), true);
    assert.strictEqual(isValidResolution('1920:1080'), true);
    assert.strictEqual(isValidResolution('-1:720'), true);
    assert.strictEqual(isValidResolution('1280:-1'), true);
    assert.strictEqual(isValidResolution('-1:-1'), false);
    assert.strictEqual(isValidResolution('1920x1080'), false);
  });

  test('rejects start time plus duration beyond metadata duration', () => {
    const error = validateConversionOptions({ ...baseOptions, startTime: 50, duration: 20 }, {
      duration: 60,
      width: 1920,
      height: 1080,
      fps: 30
    });

    assert.match(error ?? '', /exceeds the video length/);
  });

  test('accepts fps zero as keep source fps', () => {
    assert.strictEqual(validateConversionOptions({ ...baseOptions, fps: 0 }), null);
  });
});
