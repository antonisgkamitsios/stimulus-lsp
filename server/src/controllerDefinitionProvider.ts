import { Location } from 'vscode-languageserver/node';
import { ControllersStore } from './controllersStore';
import { normalizePath } from './utils';
import { ControllerInfo, Location as ControllerLocation } from './types';

type LocFunc = (info: ControllerInfo, attributeName?: string) => ControllerLocation | undefined;

export class ControllerDefinitionProvider {
  #controllerStore: ControllersStore;
  #relPos!: number;

  #defaultLoc: ControllerLocation = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 0 },
  };

  constructor(controllerStore: ControllersStore) {
    this.#controllerStore = controllerStore;
  }

  doProvide(source: string, pos: number): Location[] | null {
    const word = this.#findWord(source, pos);

    if (!word) return null;

    const dataAttributeDefinitions = this.#definitionForAttributes(word);
    if (dataAttributeDefinitions && dataAttributeDefinitions.length > 0) return dataAttributeDefinitions;

    // todo here we will add value
    return null;
  }

  #definitionForAttributes(attribute: string): Location[] | null {
    const dataTargetIdentifier = attribute.match(/data-([a-z0-9-]+)-target/)?.[1];

    if (dataTargetIdentifier) {
      return this.#provideDataTargetDefinitions(dataTargetIdentifier);
    }

    const dataValueMatches = attribute.match(/data-[a-z0-9-]+-value/);
    if (dataValueMatches) {
      return this.#provideDataValueDefinitions(attribute);
    }

    const dataClassMatches = attribute.match(/data-[a-z0-9-]+-class/);
    if (dataClassMatches) {
      return this.#provideDataClassDefinitions(attribute);
    }

    const dataOutletMatches = attribute.match(/data-[a-z0-9-]+-outlet/);
    if (dataOutletMatches) {
      return this.#provideDataOutletDefinitions(attribute);
    }

    return null;
  }

  #provideDataTargetDefinitions(identifier: string): Location[] | null {
    return this.#getIdentifierLocations(identifier, (info) => info.targets[0]?.loc);
  }

  #provideDataValueDefinitions(attribute: string): Location[] | null {
    return this.#parseAttributeToLocations(
      attribute,
      'value',
      (info, valueName) => info.values.find((v) => v.name === valueName)?.loc,
    );
  }

  #provideDataClassDefinitions(attribute: string): Location[] | null {
    return this.#parseAttributeToLocations(
      attribute,
      'class',
      (info, classname) => info.classes.find((c) => c.name === classname)?.loc,
    );
  }

  #provideDataOutletDefinitions(_attribute: string): Location[] | null {
    // data-(identifier)-(identifier)-outlet
    //    ^     ^                 ^      ^

    return null;
  }

  #parseAttributeToLocations(attribute: string, suffix: string, locFunc: LocFunc): Location[] | null {
    const inner = attribute.slice('data-'.length, -`-${suffix}`.length);

    const parts = inner.split('-');

    for (let i = parts.length - 1; i >= 0; i--) {
      const identifier = parts.slice(0, i).join('-');

      const attributeName = parts.slice(i).join('-');

      const locations = this.#getIdentifierLocations(identifier, (info: ControllerInfo) =>
        locFunc(info, attributeName),
      );

      if (locations) return locations;
    }

    return null;
  }

  #getIdentifierLocations(identifier: string, locFunc: LocFunc): Location[] | null {
    const controllerInfos = this.#controllerStore.getControllerInfosByIdentifier(identifier);

    if (controllerInfos.length === 0) {
      return null;
    }

    return controllerInfos.map((info) => {
      const location = locFunc(info) || this.#defaultLoc;
      return this.#provideLocation(info.fullPath, location);
    });
  }

  #provideLocation(path: string, location?: ControllerLocation): Location {
    const normalizedPath = normalizePath(path);
    const fileUri = normalizedPath.startsWith('/') ? 'file://' + normalizedPath : 'file:///' + normalizedPath;
    location ||= this.#defaultLoc;

    return {
      uri: fileUri,
      range: location,
    };
  }

  #findWord(source: string, pos: number): string | null {
    let wordStart = pos;
    let wordEnd = pos;

    // Find word boundaries
    while (wordStart > 0 && /[a-z0-9-]/i.test(source[wordStart - 1])) {
      wordStart--;
    }
    while (wordEnd < source.length && /[a-z0-9-]/i.test(source[wordEnd])) {
      wordEnd++;
    }

    const word = source.substring(wordStart, wordEnd);

    if (!word || word.length === 0) {
      return null;
    }

    this.#relPos = pos - wordStart;
    console.log(this.#relPos);

    return word;
  }
}
