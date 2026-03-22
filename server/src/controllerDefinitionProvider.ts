import { Location } from 'vscode-languageserver/node';
import { ControllersStore } from './controllersStore';
import { normalizePath } from './utils';
import { ControllerInfo, Location as ControllerLocation } from './types';
import { ActionParser } from './actionParser';

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

    const dataAttributeAndValue = this.#findDataAttributeAndValue(source, pos);

    if (!dataAttributeAndValue) return null;
    return this.#definitionForValues(dataAttributeAndValue.dataAttribute, dataAttributeAndValue.value);
  }

  #definitionForValues(attribute: string, value: string): Location[] | null {
    if (attribute === 'data-controller') {
      return this.#getIdentifierLocations(value);
    }

    const dataTargetIdentifier = attribute.match(/data-([a-z0-9-]+)-target/)?.[1];
    if (dataTargetIdentifier) {
      return this.#getIdentifierLocations(
        dataTargetIdentifier,
        (info) => info.targets.find((t) => t.name === value)?.loc,
      );
    }

    if (attribute === 'data-action') {
      const parsedAction = new ActionParser(value);
      if (!parsedAction.valid || !parsedAction.identifier) return null;

      return this.#getIdentifierLocations(
        parsedAction.identifier,
        (info) => info.methods.find((m) => m.name === parsedAction.method)?.loc,
      );
    }

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

  #provideDataOutletDefinitions(attribute: string): Location[] | null {
    // data-(identifier)-(identifier)-outlet

    // data-foo--bar-baz--bam-outlet
    // inner => foo--bar-baz--bam

    const dataPrefixLength = 'data-'.length;
    const inner = attribute.slice(dataPrefixLength, -'-outlet'.length);
    const innerPos = this.#relPos - dataPrefixLength;
    // we are outside of the bounds so we return the location of the main controller + it's outlet
    if (innerPos < 0 || innerPos > inner.length - 1) {
      return this.#parseAttributeToLocations(
        attribute,
        'outlet',
        (info, outletName) => info.outlets.find((o) => o.name === outletName)?.loc,
      );
    }

    // first we walk to the right until we find a matching identifier
    for (let i = innerPos; i < inner.length - 1; i++) {
      const partBeforeCursor = inner.substring(0, i);

      const locations = this.#getIdentifierLocations(partBeforeCursor);
      if (locations && locations.length > 0) {
        return locations;
      }
    }

    // then we walk to the left until we find a matching identifier
    for (let i = innerPos; i >= 0; i--) {
      const partAfterCursor = inner.substring(i);

      const locations = this.#getIdentifierLocations(partAfterCursor);
      if (locations && locations.length > 0) {
        return locations;
      }
    }

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

  #getIdentifierLocations(identifier: string, locFunc?: LocFunc): Location[] | null {
    const controllerInfos = this.#controllerStore.getControllerInfosByIdentifier(identifier);

    if (controllerInfos.length === 0) {
      return null;
    }

    return controllerInfos.map((info) => {
      const location = locFunc?.(info) || this.#defaultLoc;
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

    return word;
  }

  #findDataAttributeAndValue(source: string, pos: number): { dataAttribute: string; value: string } | null {
    let startPos = pos;
    let endPos = pos;

    const endChars = ["'", '"', ' '];

    // walk left and right until we find the range of the value
    while (startPos > 0 && !endChars.includes(source[startPos - 1])) {
      startPos--;
    }
    while (endPos < source.length && !endChars.includes(source[endPos])) {
      endPos++;
    }
    const value = source.substring(startPos, endPos);

    // walk left until we find `=`
    while (startPos > 0 && source[startPos] !== '=') {
      startPos--;
    }
    if (source[startPos] !== '=') return null;

    // walk left until we find first character
    while (startPos > 0 && /[a-z0-9-]/i.test(source[startPos])) {
      startPos--;
    }
    // `=` was at the start of the source
    if (startPos === 0) return null;

    endPos = startPos;
    // walk left until we find the end of the data attribute
    while (startPos > 0 && /[a-z0-9-]/i.test(source[startPos - 1])) {
      startPos--;
    }

    const dataAttribute = source.substring(startPos, endPos);

    return { dataAttribute, value };
  }
}
