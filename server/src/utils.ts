import { URI } from 'vscode-uri';

export function stripFilePrefix(uri: string): string {
  return URI.parse(uri).fsPath;
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}
