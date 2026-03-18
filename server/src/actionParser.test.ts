import { describe, expect, it } from 'vitest';
import { CursorOnOptions, ActionParser } from './actionParser';

describe('parseAction', () => {
  const testCases: {
    input: string;
    expectedValid: boolean;
    expectedCursorOn?: CursorOnOptions;
    expectedValue?: string;
    expectedIdentifier?: string;
    expectedMethod?: string;
  }[] = [
    { input: '', expectedValid: true, expectedCursorOn: 'eventOrIdentifier', expectedValue: '' },
    { input: '@', expectedValid: false },
    { input: '#', expectedValid: false },
    { input: ':', expectedValid: false },
    { input: ':', expectedValid: false },
    { input: '-', expectedValid: false },
    { input: '->', expectedValid: false },
    { input: 'nonExistent.ctrl+a', expectedValid: false }, // it is neither identifier(it contains . and +) nor an event (it is not included in the events)
    { input: 'foo->', expectedValid: false },
    { input: 'foo@', expectedValid: false },
    { input: 'foo:', expectedValid: false },
    { input: 'foo#bar#', expectedValid: false },
    { input: '@foo#bar:', expectedValid: false },
    { input: 'foo#bar::', expectedValid: false },
    { input: 'click@document->@', expectedValid: false },
    { input: 'click@docu->', expectedValid: false },
    { input: 'click@document->1foo', expectedValid: false },
    { input: 'foo', expectedValid: true, expectedCursorOn: 'eventOrIdentifier', expectedValue: '' },
    { input: 'click', expectedValid: true, expectedCursorOn: 'eventOrIdentifier', expectedValue: '' },
    { input: 'keydown.ctrl+a', expectedValid: true, expectedCursorOn: 'eventOrIdentifier', expectedValue: '' },
    { input: 'foo#', expectedValid: true, expectedCursorOn: 'method', expectedValue: 'foo#' },
    {
      input: 'foo#bar',
      expectedValid: true,
      expectedCursorOn: 'method',
      expectedValue: 'foo#',
      expectedIdentifier: 'foo',
      expectedMethod: 'bar',
    },
    {
      input: 'foo#bar:',
      expectedValid: true,
      expectedCursorOn: 'option',
      expectedValue: 'foo#bar:',
      expectedIdentifier: 'foo',
      expectedMethod: 'bar',
    },
    { input: 'click->', expectedValid: true, expectedCursorOn: 'identifier', expectedValue: 'click->' },
    {
      input: 'click@document->',
      expectedValid: true,
      expectedCursorOn: 'identifier',
      expectedValue: 'click@document->',
    },
    {
      input: 'click@document->foo',
      expectedValid: true,
      expectedCursorOn: 'identifier',
      expectedValue: 'click@document->',
      expectedIdentifier: 'foo',
    },
    {
      input: 'keydown.ctrl+a@document->foo#bar:',
      expectedValid: true,
      expectedCursorOn: 'option',
      expectedValue: 'keydown.ctrl+a@document->foo#bar:',
      expectedIdentifier: 'foo',
      expectedMethod: 'bar',
    },
    {
      input: 'keydown.ctrl+a@document->foo#bar:asd',
      expectedValid: true,
      expectedCursorOn: 'option',
      expectedValue: 'keydown.ctrl+a@document->foo#bar:',
      expectedIdentifier: 'foo',
      expectedMethod: 'bar',
    },

    {
      input: 'keydown.ctrl+a@document->foo#bar:!asd',
      expectedValid: true,
      expectedCursorOn: 'option',
      expectedValue: 'keydown.ctrl+a@document->foo#bar:',
      expectedIdentifier: 'foo',
      expectedMethod: 'bar',
    },
    {
      input: 'keydown.ctrl+a@document->foo-bar#baz:!asd',
      expectedValid: true,
      expectedCursorOn: 'option',
      expectedValue: 'keydown.ctrl+a@document->foo-bar#baz:',
      expectedIdentifier: 'foo-bar',
      expectedMethod: 'baz',
    },
    {
      input: 'click->test--user#foo',
      expectedValid: true,
      expectedCursorOn: 'method',
      expectedValue: 'click->test--user#',
      expectedIdentifier: 'test--user',
      expectedMethod: 'foo',
    },
  ];

  testCases.forEach((tt, index) => {
    it(`${index}: returns the correct values for '${tt.input}'`, () => {
      const result = new ActionParser(tt.input);

      expect(result.valid).toBe(tt.expectedValid);

      if (tt.expectedCursorOn) {
        expect(result.cursorOn).toBe(tt.expectedCursorOn);
      }

      if (tt.expectedValue) {
        expect(result.prefixValue).toBe(tt.expectedValue);
      }

      if (tt.expectedIdentifier) {
        expect(result.identifier).toBe(tt.expectedIdentifier);
      }

      if (tt.expectedMethod) {
        expect(result.method).toBe(tt.expectedMethod);
      }
    });
  });
});
