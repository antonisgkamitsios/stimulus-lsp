import { describe, it } from 'vitest';

import { ControllerParser } from './controllerParser';

describe('ControllerParser', () => {
  const sourceCode = `import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
	static values = {
		name: String,
	};

	static targets = ['foo', 'bar'];

	connect() {}

	printName() {
		console.log("Hello!");
	}
}`;
  describe('when foo', () => {
    const parser = new ControllerParser(sourceCode);
    parser.parse();

    it('foo', () => {
			console.log(sourceCode);
			
      parser.methods.forEach((m) => {
        console.log(m);
      });
    });
  });
});
