import * as assert from 'node:assert';
import { buildFfmpegArgs, buildFilterComplex, parseFfmpegProgressPercent, parseFfmpegTimemark, parseFps } from '../../videoConverter';
import { ConversionOptions } from '../../types';

suite('videoConverter - unit', () => {
  const options: ConversionOptions = {
    startTime: 2.5,
    duration: 10,
    resolution: '-1:720',
    fps: 24,
    colorCount: 128,
    optimizationLevel: 'balanced',
    dithering: true,
    lossyCompression: 80
  };

  test('buildFfmpegArgs builds shell-free cross-platform arguments', () => {
    const args = buildFfmpegArgs('/tmp/in file.mp4', '/tmp/out file.gif', options);

    assert.deepStrictEqual(args.slice(0, 7), ['-hide_banner', '-y', '-ss', '2.5', '-t', '10', '-i']);
    assert.ok(args.includes('/tmp/in file.mp4'));
    assert.ok(args.includes('/tmp/out file.gif'));
    assert.ok(args.includes('-filter_complex'));
    assert.ok(args.includes('-loop'));
  });

  test('buildFilterComplex supports source fps preservation', () => {
    const filter = buildFilterComplex({ ...options, fps: 0, resolution: 'original', dithering: false });

    assert.ok(!filter.includes('fps='));
    assert.ok(!filter.includes('scale='));
    assert.ok(filter.includes('palettegen=max_colors=128'));
    assert.ok(filter.includes('paletteuse=dither=none'));
  });

  test('parseFps parses ffprobe fractions safely', () => {
    assert.strictEqual(Math.round(parseFps('30000/1001')), 30);
    assert.strictEqual(parseFps('25/1'), 25);
    assert.strictEqual(parseFps('0/0'), 30);
  });

  test('parseFfmpegProgressPercent maps timemark against duration', () => {
    assert.strictEqual(parseFfmpegTimemark('frame=1 time=00:00:05.00 bitrate=1kbits/s'), 5);
    assert.strictEqual(parseFfmpegProgressPercent('frame=1 time=00:00:05.00 bitrate=1kbits/s', 10), 50);
    assert.strictEqual(parseFfmpegProgressPercent('frame=1', 10), null);
  });
});
