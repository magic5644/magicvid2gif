import * as os from 'node:os';
import * as vscode from 'vscode';
import { WorkspacePort } from '../../types/ports';

class VsCodeWorkspacePort implements WorkspacePort {
  private readonly context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  toFsPath(uri: string): string {
    return vscode.Uri.parse(uri).fsPath;
  }

  storagePath(): string {
    return this.context.globalStorageUri?.fsPath ?? os.tmpdir();
  }

  tmpPath(): string {
    return os.tmpdir();
  }
}

export function createWorkspacePort(context: vscode.ExtensionContext): WorkspacePort {
  return new VsCodeWorkspacePort(context);
}
