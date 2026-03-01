// Example nested Stimulus controller
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log("Admin users controller connected!")
  }
}
