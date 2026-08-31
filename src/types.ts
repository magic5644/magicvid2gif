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

export interface CancellationSignal {
  readonly isCancellationRequested?: boolean;
  onCancellationRequested(listener: () => void): { dispose(): unknown };
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export interface ConversionResult {
  outputPath: string;
  sizeMB: number;
  duration: number;
  frameCount: number;
}

export interface OptimizationResult {
  outputPath: string;
  optimized: boolean;
  skippedReason?: string;
  error?: string;
}

export type ProgressCallback = (percent: number) => void;
