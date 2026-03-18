import { IAttributeData, IHTMLDataProvider, ITagData, IValueData } from 'vscode-html-languageservice';
import { ControllersStore } from './controllersStore';
import { ELEMENTS_WITH_DEFAULT_EVENTS, EVENT_OPTIONS, EVENTS } from './events';
import { ActionParser } from './actionParser';

export class ControllerCompletionProvider implements IHTMLDataProvider {
  #id: string;
  #controllersStore: ControllersStore;
  currentLineText = '';

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
      return this.#calculateActions(tag);
    }

    const targetMatch = attribute.match(/data-([a-z0-9-]+)-target/);
    if (targetMatch && targetMatch[1]) {
      const identifier = targetMatch[1];

      return this.#getControllerTargets(identifier);
    }

    return [];
  }

  provideTags(): ITagData[] {
    return [];
  }

  #getControllerTargets(identifier: string): IValueData[] {
    const data: IValueData[] = [];

    this.#controllersStore.getControllerInfosByIdentifier(identifier).forEach((controllerInfo) => {
      controllerInfo.targets.forEach((val) => {
        data.push({ name: val.name, description: controllerInfo.relativePath });
      });
    });

    return data;
  }

  #calculateActions(tag: string): IValueData[] {
    const data: IValueData[] = [];

    const dataActionValue = this.currentLineText.match(/data-action=["']([^"']*)$/i)?.[1];
    if (dataActionValue === undefined) return data;

    const actions = dataActionValue.split(/\s+/);
    const currentAction = actions[actions.length - 1];

    const res = new ActionParser(currentAction);

    if (!res.valid) return data;

    switch (res.cursorOn) {
      case 'eventOrIdentifier': {
        EVENTS.forEach((event) => {
          data.push({ name: event });
        });

        // tag contains default event, so we add the identifiers
        if (ELEMENTS_WITH_DEFAULT_EVENTS[tag as keyof typeof ELEMENTS_WITH_DEFAULT_EVENTS]) {
          this.controllers.forEach((controllerInfo) => {
            data.push({ name: controllerInfo.identifier, description: controllerInfo.relativePath });
          });
        }
        break;
      }
      case 'target': {
        ['window', 'document'].forEach((elem) => {
          data.push({ name: `${res.prefixValue}${elem}` });
        });
        break;
      }
      case 'identifier': {
        this.controllers.forEach((controllerInfo) => {
          data.push({
            name: `${res.prefixValue}${controllerInfo.identifier}`,
            description: controllerInfo.relativePath,
          });
        });
        break;
      }
      case 'method': {
        if (!res.identifier) return data;

        this.#controllersStore.getControllerInfosByIdentifier(res.identifier).forEach((controllerInfo) => {
          controllerInfo.methods.forEach((method) => {
            data.push({ name: `${res.prefixValue}${method.name}`, description: controllerInfo.relativePath });
          });
        });
        break;
      }
      case 'option': {
        EVENT_OPTIONS.forEach((opt) => {
          data.push({
            name: `${res.prefixValue}:${opt}`,
          });
        });
      }
    }

    return data;
  }
}
