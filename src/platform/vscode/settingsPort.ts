import * as vscode from 'vscode';
import { SettingsPort } from '../../types/ports';

class VsCodeSettingsPort implements SettingsPort {
  private readonly section: string;

  constructor(section = 'magicvid2gif') {
    this.section = section;
  }

  get<T>(key: string, fallback: T): T {
    const config = vscode.workspace.getConfiguration(this.section);
    return config.get<T>(key, fallback);
  }
}

export function createSettingsPort(section?: string): SettingsPort {
  return new VsCodeSettingsPort(section);
}
