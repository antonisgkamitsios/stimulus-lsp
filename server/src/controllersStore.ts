import * as fs from 'fs';
import * as path from 'path';

import { Connection } from 'vscode-languageserver';
import { ControllerIdentifier, ControllerPath, StimulusSettings } from './types';
import { controllerIdentifierFromPath } from './utils';
import { Glob } from './glob';

export class ControllersStore {
  //  by design when we are going to access the workspaceRoot is going to be set by the `onInitialize` method
  workspaceRoot!: string;
  connection: Connection;
  #controllers: Map<ControllerPath, ControllerIdentifier>;

  constructor(connection: Connection) {
    this.connection = connection;
    this.#controllers = new Map<ControllerPath, ControllerIdentifier>();
  }

  async populateControllers(settings: StimulusSettings) {
    const glob = new Glob(settings.fileWatchPattern);

    settings.controllersDirs.forEach((controllersDir) => {
      this.#parseController(controllersDir, glob);
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
    return this.#controllers.forEach(callbackfn, thisArg);
  }

  clear() {
    this.#controllers.clear();
  }

  addController(key: ControllerPath, value: ControllerIdentifier) {
    this.#controllers.set(key, value);
  }

  deleteController(key: ControllerPath) {
    this.#controllers.delete(key);
  }

  getControllerPathByIdentifier(identifier: ControllerIdentifier): ControllerPath[] {
    const controllerPaths: ControllerPath[] = [];
    this.#controllers.forEach((ident, path) => {
      if (ident == identifier) {
        controllerPaths.push(path);
      }
    });

    return controllerPaths;
  }

  #parseController(controllersDir: string, glob: Glob) {
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
            this.#controllers.set(fullFilePath, controllerIdentifier);
          }
        }
      };

      walkDir(fullPath);
    } catch (error) {
      this.connection.console.log(`[readControllers] Error reading controllers: ${error}`);
    }
  }
}
