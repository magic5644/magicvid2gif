/**
 * Types and interfaces for MagicVid2Gif
 */

export interface ConversionOptions {
  startTime: number;
  duration: number;
  resolution: string;
  fps: number;
  colorCount: number;
  optimizationLevel: 'fast' | 'balanced' | 'quality' | 'ultra';
  dithering: boolean;
  lossyCompression: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export interface FfmpegProgress {
  frames?: number;
  currentFps?: number;
  currentKbps?: number;
  targetSize?: number;
  timemark?: string;
  percent?: number;
}

export interface ConversionResult {
  outputPath: string;
  sizeMB: number;
  duration: number;
  frameCount: number;
}

export type ProgressCallback = (percent: number) => void;
