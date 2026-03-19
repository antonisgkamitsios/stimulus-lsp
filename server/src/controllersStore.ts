import * as fs from 'fs';
import * as path from 'path';

import { Connection } from 'vscode-languageserver';
import { ControllerIdentifier, ControllerInfo, ControllerPath } from './types';
import { controllerIdentifierFromPath } from './utils';
import { Glob } from './glob';
import { StimulusSettings } from 'shared';
import { ControllerParser } from './controllerParser';

export class ControllersStore {
  //  by design when we are going to access the workspaceRoot is going to be set by the `onInitialize` method
  workspaceRoot!: string;
  connection: Connection;
  #controllers: Map<ControllerPath, ControllerInfo>;
  hasErrored: boolean;

  constructor(connection: Connection) {
    this.connection = connection;
    this.#controllers = new Map<ControllerPath, ControllerInfo>();
    this.hasErrored = false;
  }

  async populateControllers(settings: StimulusSettings) {
    const glob = new Glob(settings.fileWatchPattern);

    settings.controllersDirs.forEach((controllersDir) => {
      this.#parseControllers(controllersDir, glob);
    });
  }

  forEach(
    callbackfn: (value: ControllerInfo, key: ControllerPath, map: Map<ControllerPath, ControllerInfo>) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisArg?: any,
  ): void {
    return this.#controllers.forEach(callbackfn, thisArg);
  }

  clear() {
    this.hasErrored = false;
    this.#controllers.clear();
  }

  addController(controllerPath: ControllerPath, identifier: ControllerIdentifier) {
    const controllerSourceCode = fs.readFileSync(controllerPath, 'utf-8');
    const parser = ControllerParser.parse(controllerSourceCode, controllerPath);
    const controllerInfo: ControllerInfo = {
      identifier: identifier,
      relativePath: path.relative(this.workspaceRoot, controllerPath),
      methods: parser.methods,
      classes: parser.classes,
      targets: parser.targets,
      values: parser.values,
    };
    this.#controllers.set(controllerPath, controllerInfo);
  }

  deleteController(key: ControllerPath) {
    this.#controllers.delete(key);
  }

  getControllerPathsByIdentifier(identifier: ControllerIdentifier): ControllerPath[] {
    const [controllerPaths] = this.#getControllersByIdentifier(identifier);

    return controllerPaths;
  }

  getControllerInfosByIdentifier(identifier: ControllerIdentifier): ControllerInfo[] {
    const [, controllerInfos] = this.#getControllersByIdentifier(identifier);

    return controllerInfos;
  }

  get controllerInfos(): ControllerInfo[] {
    return [...this.#controllers.values()];
  }

  getFullPathToControllersDir(controllersDir: string): string {
    return path.isAbsolute(controllersDir) ? controllersDir : path.join(this.workspaceRoot, controllersDir);
  }

  #getControllersByIdentifier(identifier: ControllerIdentifier): [ControllerPath[], ControllerInfo[]] {
    const controllerPaths: ControllerPath[] = [];
    const controllerInfos: ControllerInfo[] = [];

    this.#controllers.forEach((info, path) => {
      if (info.identifier == identifier) {
        controllerPaths.push(path);
        controllerInfos.push(info);
      }
    });

    return [controllerPaths, controllerInfos];
  }

  #parseControllers(controllersDir: string, glob: Glob) {
    const fullPathToControllersDir = this.getFullPathToControllersDir(controllersDir);

    try {
      if (!fs.existsSync(fullPathToControllersDir)) {
        this.connection.console.log(`[readControllers] Directory does not exist: ${fullPathToControllersDir}.
          Perhaps you want to update the "stimulus.controllersDirs": [...] in your vscode settings`);
        this.hasErrored = true;
        return [];
      }

      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullControllerPath = path.join(dir, file);
          const stat = fs.statSync(fullControllerPath);

          if (stat.isDirectory()) {
            walkDir(fullControllerPath);
          } else if (glob.matchesSuffix(file)) {
            const relativePath = path.relative(fullPathToControllersDir, fullControllerPath);
            const controllerIdentifier = controllerIdentifierFromPath(relativePath, glob.base);
            this.addController(fullControllerPath, controllerIdentifier);
          }
        }
      };

      walkDir(fullPathToControllersDir);
    } catch (error) {
      this.connection.console.log(`[readControllers] Error reading controllers: ${error}`);
      this.hasErrored = true;
    }
  }
}
