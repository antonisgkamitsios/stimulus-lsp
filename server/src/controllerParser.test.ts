import { describe, expect, it } from 'vitest';
import dedent from 'dedent';

import { ControllerParser } from './controllerParser';

const dummyFilePath = 'dummy_controller.js';

describe('ControllerParser', () => {
  describe('methods', () => {
    const sourceCode = dedent`
      import { Controller } from '@hotwired/stimulus';

      export default class extends Controller {
        get foo() {}
        set boo(e) {
          console.log(e);
        }
        static baz() {}

        #bam() {}

        onlyYou(e) {
          console.log('foo called');
          console.log(e);
        }
        
        private tsPrivate(){}
      } 
  `;

    const parser = ControllerParser.parse(sourceCode, dummyFilePath);
    it('returns the correct methods', () => {
      expect(parser.methods).toHaveLength(1);
      expect(parser.methods).toEqual(
        expect.arrayContaining([
          {
            name: 'onlyYou',
            loc: {
              start: { line: 11, character: 2 },
              end: { line: 11, character: 9 },
            },
          },
        ]),
      );
    });
  });

  describe('properties', () => {
    const sourceCode = dedent`
      import { Controller } from '@hotwired/stimulus';

      const fooVar = 'foo';
      export default class extends Controller {
        static targets = ['firstTarget', 'secondTarget', fooVar];

        static classes = ['loading', 'noResults'];

        static values = {
          contentType: String,
          interval: Number,
          params: Object,
        };
      }
    `;

    const parser = ControllerParser.parse(sourceCode, dummyFilePath);

    describe('targets', () => {
      it('returns the correct targets', () => {
        expect(parser.targets).toHaveLength(2);
        expect(parser.targets).toEqual(
          expect.arrayContaining([
            {
              name: 'firstTarget',
              loc: {
                start: { line: 4, character: 20 },
                end: { line: 4, character: 33 },
              },
            },
            {
              name: 'secondTarget',
              loc: {
                start: { line: 4, character: 35 },
                end: { line: 4, character: 49 },
              },
            },
          ]),
        );
      });
    });
    describe('classes', () => {
      it('returns the correct classes', () => {
        expect(parser.classes).toHaveLength(2);
        expect(parser.classes).toEqual(
          expect.arrayContaining([
            {
              name: 'loading',
              loc: {
                start: { line: 6, character: 20 },
                end: { line: 6, character: 29 },
              },
            },
            {
              name: 'no-results',
              loc: {
                start: { line: 6, character: 31 },
                end: { line: 6, character: 42 },
              },
            },
          ]),
        );
      });
    });

    describe('values', () => {
      it('returns the correct values', () => {
        expect(parser.values).toHaveLength(3);
        expect(parser.values).toEqual(
          expect.arrayContaining([
            {
              name: 'content-type',
              loc: {
                start: { line: 9, character: 4 },
                end: { line: 9, character: 15 },
              },
            },
            {
              name: 'interval',
              loc: {
                start: { line: 10, character: 4 },
                end: { line: 10, character: 12 },
              },
            },
            {
              name: 'params',
              loc: {
                start: { line: 11, character: 4 },
                end: { line: 11, character: 10 },
              },
            },
          ]),
        );
      });
    });

    describe('when properties are ts private', () => {
      const sourceCode = dedent`
      import { Controller } from '@hotwired/stimulus';

      const fooVar = 'foo';
      export default class extends Controller {
        private static targets = ['firstTarget', 'secondTarget', fooVar];

        private static classes = ['loading', 'noResults'];

        private static values = {
          contentType: String,
          interval: Number,
          params: Object,
        };
      }
    `;

      it('ignores them', () => {
        const parser = ControllerParser.parse(sourceCode, dummyFilePath);
        expect(parser.classes).toHaveLength(0);
        expect(parser.methods).toHaveLength(0);
        expect(parser.targets).toHaveLength(0);
        expect(parser.values).toHaveLength(0);
      });
    });
    describe('when properties are private', () => {
      const sourceCode = dedent`
      import { Controller } from '@hotwired/stimulus';

      const fooVar = 'foo';
      export default class extends Controller {
        static #targets = ['firstTarget', 'secondTarget', fooVar];

        static #classes = ['loading', 'noResults'];

        static #values = {
          contentType: String,
          interval: Number,
          params: Object,
        };
      }
    `;

      it('ignores them', () => {
        const parser = ControllerParser.parse(sourceCode, dummyFilePath);
        expect(parser.classes).toHaveLength(0);
        expect(parser.methods).toHaveLength(0);
        expect(parser.targets).toHaveLength(0);
        expect(parser.values).toHaveLength(0);
      });
    });

    describe('when controller contains jsx', () => {
      const sourceCode = dedent`
        import { Controller } from '@hotwired/stimulus';

        export default class extends Controller {
          foo() {
            return (
              <Component>
                <InnerComponent>This is The test</InnerComponent>
              </Component>
            );
          }

          bar() {
            console.log('this is bar');
          }
        }
    `;

      it('returns the correct items', () => {
        const parser = ControllerParser.parse(sourceCode, dummyFilePath);
        expect(parser.methods).toHaveLength(2);
        expect(parser.methods).toEqual(
          expect.arrayContaining([expect.objectContaining({ name: 'foo' }), expect.objectContaining({ name: 'bar' })]),
        );
      });
    });

    describe('when controllers has arrow functions as methods', () => {
      const sourceCode = dedent`
        import { Controller } from '@hotwired/stimulus';

        export default class extends Controller {
          foo = () => {
            return (
              <Component>
                <InnerComponent>This is The test</InnerComponent>
              </Component>
            );
          }
          bar() {
            console.log('this is bar');
          }
          #baz = () => {}
          static bam = () => {}
          static #bambam = () => {}
          private static #bambam = () => {}
          private foofoo = () => {}
        }
    `;

      it('returns the correct items', () => {
        const parser = ControllerParser.parse(sourceCode, dummyFilePath);
        expect(parser.methods).toHaveLength(2);
        expect(parser.methods).toEqual(
          expect.arrayContaining([expect.objectContaining({ name: 'foo' }), expect.objectContaining({ name: 'bar' })]),
        );

        expect(parser.classes).toHaveLength(0);
        expect(parser.targets).toHaveLength(0);
        expect(parser.values).toHaveLength(0);
      });
    });
  });
});
