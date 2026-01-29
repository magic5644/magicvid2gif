// Interfaces defining boundaries between VS Code and core services.

export interface UiPort {
  pick<T extends { label: string; value: any }>(items: T[], placeholder?: string): Promise<T | null>;
  input(opts: { prompt: string; value?: string; validate?: (val: string) => string | undefined }): Promise<string | null>;
  info(msg: string, actions?: string[]): Promise<string | undefined>;
  warn(msg: string, actions?: string[]): Promise<string | undefined>;
  error(msg: string, actions?: string[]): Promise<string | undefined>;
  withProgress<T>(title: string, task: (update: (percent: number, msg?: string) => void) => Promise<T>): Promise<T>;
}

export interface SettingsPort {
  get<T>(key: string, fallback: T): T;
}

export interface WorkspacePort {
  toFsPath(uri: string): string;
  storagePath(): string;
  tmpPath(): string;
}
