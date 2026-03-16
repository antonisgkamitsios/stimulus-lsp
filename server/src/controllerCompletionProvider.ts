import { IAttributeData, IHTMLDataProvider, ITagData, IValueData } from 'vscode-html-languageservice';
import { ControllersStore } from './controllersStore';

export class ControllerCompletionProvider implements IHTMLDataProvider {
  #id: string;
  #controllersStore: ControllersStore;

  constructor(id: string, controllersStore: ControllersStore) {
    this.#id = id;
    this.#controllersStore = controllersStore;
  }

  isApplicable(): boolean {
    return true;
  }

  getId(): string {
    return this.#id;
  }

  get controllers() {
    return this.#controllersStore.controllerInfos;
  }

  provideAttributes(_tag: string): IAttributeData[] {
    const attributes: IAttributeData[] = [{ name: 'data-controller' }, { name: 'data-action' }];

    this.controllers.forEach((controllerInfo) => {
      if (controllerInfo.targets.length > 0) {
        attributes.push({
          name: `data-${controllerInfo.identifier}-target`,
        });
      }

      controllerInfo.values.forEach((value) => {
        attributes.push({
          name: `data-${controllerInfo.identifier}-${value.name}-value`,
        });
      });

      controllerInfo.classes.forEach((klass) => {
        attributes.push({
          name: `data-${controllerInfo.identifier}-${klass.name}-class`,
        });
      });
    });

    return attributes;
  }

  provideValues(tag: string, attribute: string): IValueData[] {
    if (attribute === 'data-controller') {
      return this.controllers.map((controllerInfo) => ({
        name: controllerInfo.identifier,
        description: controllerInfo.relativePath,
      }));
    }

    // TODO: add handling for actions
    if (attribute === 'data-action') {
      return this.controllers.map((controllerInfo) => ({
        name: controllerInfo.identifier,
        description: controllerInfo.relativePath,
      }));
    }

    return [];
  }

  provideTags(): ITagData[] {
    return [];
  }
}
