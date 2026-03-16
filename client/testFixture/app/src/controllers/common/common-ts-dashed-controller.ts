// @ts-expect-error this is for testing purposes only
import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
  static targets = ['commonTsTarget'];
}
