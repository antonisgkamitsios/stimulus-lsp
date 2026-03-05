import * as fs from 'fs';
import * as path from 'path';

import { Connection } from 'vscode-languageserver';
import { ControllerIdentifier, ControllerPath, StimulusSettings } from './types';
import { controllerIdentifierFromPath } from './utils';
import { Glob } from './glob';

export class ControllersCache {
  //  by design when we are going to access the workspaceRoot is going to be set by the `onInitialize` method
  workspaceRoot!: string;
  connection: Connection;
  getSettings: () => Promise<StimulusSettings>;
  #cachedControllers: Map<ControllerPath, ControllerIdentifier>;

  constructor(connection: Connection, getSettings: () => Promise<StimulusSettings>) {
    this.connection = connection;
    this.getSettings = getSettings;
    this.#cachedControllers = new Map<ControllerPath, ControllerIdentifier>();
  }

  async readControllersToCache() {
    const settings = await this.getSettings();

    const glob = new Glob(settings.fileWatchPattern);

    settings.controllersDirs.forEach((controllersDir) => {
      this.#addControllerFilesToCache(controllersDir, glob);
    });
  }

  forEach(
    callbackfn: (
      value: ControllerIdentifier,
      key: ControllerPath,
      map: Map<ControllerPath, ControllerIdentifier>,
    ) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisArg?: any,
  ): void {
    return this.#cachedControllers.forEach(callbackfn, thisArg);
  }

  clear() {
    this.#cachedControllers.clear();
  }

  addController(key: ControllerPath, value: ControllerIdentifier) {
    this.#cachedControllers.set(key, value);
  }

  deleteController(key: ControllerPath) {
    this.#cachedControllers.delete(key);
  }

  getControllerPathByIdentifier(identifier: ControllerIdentifier): ControllerPath[] {
    const controllerPaths: ControllerPath[] = [];
    this.#cachedControllers.forEach((ident, path) => {
      if (ident == identifier) {
        controllerPaths.push(path);
      }
    });

    return controllerPaths;
  }

  #addControllerFilesToCache(controllersDir: string, glob: Glob) {
    const fullPath = path.isAbsolute(controllersDir) ? controllersDir : path.join(this.workspaceRoot, controllersDir);

    try {
      if (!fs.existsSync(fullPath)) {
        this.connection.console.log(`[readControllers] Directory does not exist: ${fullPath}`);
        return [];
      }

      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullFilePath = path.join(dir, file);
          const stat = fs.statSync(fullFilePath);

          if (stat.isDirectory()) {
            walkDir(fullFilePath);
          } else if (glob.matchesSuffix(file)) {
            const relativePath = path.relative(fullPath, fullFilePath);
            const controllerIdentifier = controllerIdentifierFromPath(relativePath, glob.base);
            this.#cachedControllers.set(fullFilePath, controllerIdentifier);
          }
        }
      };

      walkDir(fullPath);
    } catch (error) {
      this.connection.console.log(`[readControllers] Error reading controllers: ${error}`);
    }
  }
}
