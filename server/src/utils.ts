import { URI } from 'vscode-uri';

export function stripFilePrefix(uri: string): string {
  return URI.parse(uri).fsPath;
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function arraysEqual(arr1: string[], arr2: string[]): boolean {
  if (arr1 === arr2) {
    return true;
  }

  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}
export function controllerIdentifierFromPath(filePath: string): string {
  const relativePath = normalizePath(filePath);
  const withoutExtension = relativePath.replace(/\.[^.]*$/, '');
  const withoutSuffix = withoutExtension.replace(/_controller$/, '');

  const controllerName = withoutSuffix.replace(/\//g, '--').replace(/_/g, '-');

  return controllerName;
}
