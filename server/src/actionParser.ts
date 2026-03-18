import { EVENTS, EVENT_TARGETS } from './events';

export type CursorOnOptions = 'eventOrIdentifier' | 'target' | 'identifier' | 'method' | 'option';
export interface ActionDescriptor {
  cursorOn: CursorOnOptions;
  valid: boolean;
  prefixValue: string;
  identifier?: string;
  method?: string;
}

export class ActionParser {
  #source: string;
  cursorOn: CursorOnOptions;
  valid: boolean;
  prefixValue: string;
  identifier?: string;
  method?: string;

  #cursorValueToOption: Record<string, CursorOnOptions> = {
    ':': 'option',
    '#': 'method',
    '->': 'identifier',
    '@': 'target',
  };

  constructor(source: string) {
    this.#source = source;
    this.cursorOn = 'eventOrIdentifier';
    this.valid = this.#parseAction(source);
    this.prefixValue = '';

    if (this.valid) {
      this.#calculateCurrentCursor();
    }
  }

  #calculateCurrentCursor() {
    for (const key of [':', '#', '->', '@']) {
      const idx = this.#source.indexOf(key);
      if (idx !== -1) {
        this.cursorOn = this.#cursorValueToOption[key];
        this.prefixValue = this.#chopAfterPos(this.#source, idx + key.length);

        break;
      }
    }
  }

  #parseAction(action: string) {
    if (action === '') return true;

    const [eventWithIdentifier, method, ...rest] = action.split('#');
    // more than one `#`
    if (rest.length > 0) return false;

    const isEventWithIdentifierValid = this.#parseEventWithIdentifier(eventWithIdentifier);
    if (!isEventWithIdentifierValid) return false;

    if (method) {
      return this.#parseMethodWithOptions(method);
    }
    return true;
  }

  #parseMethodWithOptions(method: string): boolean {
    const [methodName, option, ...rest] = method.split(':');
    if (rest.length > 0) return false;
    const isMethodNameValid = this.#parseMethod(methodName);
    if (!isMethodNameValid) return false;

    if (option) {
      return this.#parseOption(option);
    }

    return true;
  }

  // click->foo => true
  // foo => true
  // click@document->foo =>true
  // '' => false
  #parseEventWithIdentifier(eventWithIdentifier: string): boolean {
    const [beforeArrow, afterArrow, ...rest] = eventWithIdentifier.split('->');

    // more than one `->`
    if (rest.length > 0) return false;

    // click->foo
    if (beforeArrow && afterArrow) {
      return this.#parseEventWithTarget(beforeArrow) && this.#parseIdentifier(afterArrow);
    }

    // click@document || foo
    if (afterArrow === undefined) {
      return this.#parseEventWithTarget(beforeArrow) || this.#parseIdentifier(beforeArrow);
    }

    // click@document-> or foo->
    return this.#parseEventWithTarget(beforeArrow);
  }

  // click@document => true
  // click->@
  #parseEventWithTarget(eventWithOptionalTarget: string): boolean {
    const [event, target, ...rest] = eventWithOptionalTarget.split('@');

    // more than one `@`
    if (rest.length > 1) return false;

    if (!event) return false;

    if (target) {
      return this.#parseTarget(target);
    }

    return this.#parseEvent(event);
  }

  // TODO: perhaps event, target and option should me more loose
  #parseEvent(event: string): boolean {
    return EVENTS.includes(event.split('.')[0]);
  }

  #parseTarget(target: string): boolean {
    return EVENT_TARGETS.includes(target);
  }

  #parseIdentifier(identifier: string): boolean {
    const isIdentifierValid = /^[a-zA-Z][a-zA-Z0-9-]*$/.test(identifier);
    if (isIdentifierValid) this.identifier = identifier;

    return isIdentifierValid;
  }

  #parseMethod(methodName: string): boolean {
    const isMethodValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(methodName);
    if (isMethodValid) this.method = methodName;

    return isMethodValid;
  }
  #parseOption(option: string): boolean {
    return /^!?[a-zA-Z_][a-zA-Z0-9_]*$/.test(option);
  }
  #chopAfterPos(value: string, pos: number): string {
    return value.substring(0, pos);
  }
}
