import * as vscode from 'vscode';
import { UiPort } from '../../types/ports';

class VsCodeUiPort implements UiPort {
  async pick<T extends { label: string; value: any }>(items: T[], placeholder?: string): Promise<T | null> {
    const choice = await vscode.window.showQuickPick(
      items.map(item => ({ label: item.label, value: item.value })),
      { placeHolder: placeholder, canPickMany: false }
    );

    if (!choice) {return null;}
    return items.find(i => i.value === choice.value) ?? null;
  }

  async input(opts: { prompt: string; value?: string; validate?: (val: string) => string | undefined }): Promise<string | null> {
    const value = await vscode.window.showInputBox({
      prompt: opts.prompt,
      value: opts.value,
      validateInput: opts.validate
    });
    return value ?? null;
  }

  async info(msg: string, actions?: string[]): Promise<string | undefined> {
    return vscode.window.showInformationMessage(msg, ...(actions ?? []));
  }

  async warn(msg: string, actions?: string[]): Promise<string | undefined> {
    return vscode.window.showWarningMessage(msg, ...(actions ?? []));
  }

  async error(msg: string, actions?: string[]): Promise<string | undefined> {
    return vscode.window.showErrorMessage(msg, ...(actions ?? []));
  }

  async withProgress<T>(title: string, task: (update: (percent: number, msg?: string) => void) => Promise<T>): Promise<T> {
    return vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title, cancellable: false },
      async progress => {
        let lastPercent = 0;
        const update = (percent: number, message?: string) => {
          const clamped = Math.min(100, Math.max(0, percent));
          const increment = clamped - lastPercent;
          lastPercent = clamped;
          progress.report({ increment, message });
        };
        return task(update);
      }
    );
  }
}

export function createUiPort(): UiPort {
  return new VsCodeUiPort();
}
