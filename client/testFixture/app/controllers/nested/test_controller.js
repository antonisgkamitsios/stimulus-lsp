import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
  static targets = ['firstTarget', 'secondTarget'];

  foo() {
    // eslint-disable-next-line no-undef
    console.log('foo');
  }

  bar() {
    // eslint-disable-next-line no-undef
    console.log('bar');
  }
}
