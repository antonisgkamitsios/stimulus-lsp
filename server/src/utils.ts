import * as fs from 'fs';
import * as path from 'path';

export function stripFilePrefix(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function findProjectRoot(startPath: string, maxLevels = 10): string {
  let current = startPath;

  for (let i = 0; i < maxLevels; i++) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }

    const parent = path.dirname(current);
    current = parent;
  }

  return startPath;
}
