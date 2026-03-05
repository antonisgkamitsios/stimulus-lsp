import * as path from 'path';
import { URI } from 'vscode-uri';

export function stripFilePrefix(uri: string): string {
  return URI.parse(uri).fsPath;
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function controllerIdentifierFromPath(filePath: string, baseName: string): string {
  const relativePath = normalizePath(filePath);
  const withoutExtension = relativePath.replace(/\.[^.]*$/, '');
  const withoutSuffix = withoutExtension.replace(new RegExp(`${baseName}$`), '');

  const controllerName = withoutSuffix.replace(/\//g, '--').replace(/_/g, '-');

  return controllerName;
}

export function getFullControllersPaths(workspaceRoot: string, controllersDirs: string[]): string[] {
  return controllersDirs.map((controllerDir) =>
    path.isAbsolute(controllerDir) ? controllerDir : path.join(workspaceRoot, controllerDir),
  );
}

export function getFullAndRelativeControllerPath(fileUri: string, fullControllersPaths: string[]): string[] {
  let fullControllerPath = '';
  let relativeControllerPath = '';
  const filePath = stripFilePrefix(fileUri);
  fullControllersPaths.forEach((fullPath) => {
    const relativePath = normalizePath(path.relative(fullPath, filePath));

    if (relativePath.startsWith('..')) return;

    fullControllerPath = path.join(fullPath, relativePath);
    relativeControllerPath = relativePath;
  });

  return [fullControllerPath, relativeControllerPath];
}
