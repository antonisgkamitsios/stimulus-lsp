// Example Stimulus controller
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  validate() {
    console.log("Form validator controller validating!")
  }
}
