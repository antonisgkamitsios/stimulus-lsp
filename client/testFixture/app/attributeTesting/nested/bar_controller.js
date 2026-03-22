import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
  static classes = ['firstClass', 'secondClass'];

  static outlets = ['first-outlet'];

  static values = {
    firstValue: Boolean,
    secondValue: String,
  };
}
