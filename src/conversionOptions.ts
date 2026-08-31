import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConversionOptions, VideoMetadata } from './types';

const RESOLUTION_PATTERN = /^(original|(?:-1|[1-9]\d*):(?:-1|[1-9]\d*))$/;
const OPTIMIZATION_LEVELS = new Set(['fast', 'balanced', 'quality', 'ultra']);
const COLOR_COUNTS = new Set([64, 128, 256]);

export function isValidResolution(value: string): boolean {
  if (!RESOLUTION_PATTERN.test(value)) {
    return false;
  }

  if (value === 'original') {
    return true;
  }

  const [width, height] = value.split(':').map(Number);
  return !(width === -1 && height === -1);
}

export function parseNumberInput(value: string, options: { min: number; max?: number; allowEmpty?: boolean }): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 && options.allowEmpty) {
    return 0;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < options.min) {
    return null;
  }

  if (options.max !== undefined && parsed > options.max) {
    return null;
  }

  return parsed;
}

export function validateConversionOptions(options: ConversionOptions, metadata?: VideoMetadata): string | null {
  if (!Number.isFinite(options.startTime) || options.startTime < 0) {
    return 'Start time must be a positive number.';
  }

  if (!Number.isFinite(options.duration) || options.duration < 0) {
    return 'Duration must be 0 or a positive number.';
  }

  if (metadata && metadata.duration > 0 && options.startTime > metadata.duration) {
    return `Start time exceeds the video length (${metadata.duration.toFixed(1)}s).`;
  }

  if (metadata && metadata.duration > 0 && options.duration > 0 && options.startTime + options.duration > metadata.duration) {
    return `Start time plus duration exceeds the video length (${metadata.duration.toFixed(1)}s).`;
  }

  if (!isValidResolution(options.resolution)) {
    return 'Resolution must be original, width:height, or -1:height / width:-1.';
  }

  if (!Number.isFinite(options.fps) || options.fps < 0 || options.fps > 60) {
    return 'FPS must be between 0 and 60. Use 0 to keep the source FPS.';
  }

  if (!COLOR_COUNTS.has(options.colorCount)) {
    return 'Color count must be 64, 128, or 256.';
  }

  if (!OPTIMIZATION_LEVELS.has(options.optimizationLevel)) {
    return 'Optimization level must be fast, balanced, quality, or ultra.';
  }

  if (!Number.isFinite(options.lossyCompression) || options.lossyCompression < 0 || options.lossyCompression > 200) {
    return 'Lossy compression must be between 0 and 200.';
  }

  return null;
}

export function createUniqueOutputPath(inputPath: string): string {
  const parsedPath = path.parse(inputPath);
  const basePath = path.join(parsedPath.dir, `${parsedPath.name}_magic.gif`);

  if (!fs.existsSync(basePath)) {
    return basePath;
  }

  for (let index = 1; index < 10_000; index += 1) {
    const candidate = path.join(parsedPath.dir, `${parsedPath.name}_magic_${index}.gif`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to create a unique output path for ${inputPath}`);
}
