import * as vscode from 'vscode';
import * as assert from 'assert';
import {
  activateExtension,
  openDoc,
  resetSettings,
  deleteController,
  triggerAutoComplete,
  updateSettings,
  waitForCompletions,
  createController,
} from '../helper';

describe('data-controller target completion', () => {
  before(async () => {
    await activateExtension();
  });
  after(async () => {
    await resetSettings();
    deleteController('app/src/controllers/common/newly_created_controller.js'); // ensure we delete it if something fails
  });

  const position = new vscode.Position(3, 31);

  describe('For html files', () => {
    it('returns the correct targets', async () => {
      const docUri = await openDoc('completionController.html');

      let expectedCompletionTargets = ['firstTarget', 'secondTarget'];
      let actualCompletionTargets = await triggerAutoComplete(docUri, position);

      assert.deepStrictEqual(actualCompletionTargets.sort(), expectedCompletionTargets.sort());

      // we change setting
      await updateSettings({ controllersDirs: ['./app/non_existent'] });

      actualCompletionTargets = await waitForCompletions(docUri, position, (c) => c.length === 0);
      // it does not return any targets
      assert.equal(actualCompletionTargets.length, 0);

      // we change controllersDirs to multiple folders
      await updateSettings({ controllersDirs: ['./app/src/controllers/common', './app/src/controllers/uncommon'] });

      // autocomplete on the common target
      expectedCompletionTargets = ['commonTarget'];
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(4, 25), (c) =>
        c.includes('commonTarget'),
      );
      assert.deepStrictEqual(actualCompletionTargets.sort(), expectedCompletionTargets.sort());

      // autocomplete on the uncommon target
      expectedCompletionTargets = ['uncommonTarget'];
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(5, 27), (c) =>
        c.includes('uncommonTarget'),
      );
      assert.deepStrictEqual(actualCompletionTargets.sort(), expectedCompletionTargets.sort());

      const controllerContent = `
      import { Controller } from '@hotwired/stimulus';

      export default class extends Controller {
        static targets = ['newTarget1', 'newTarget2'];
      }
      `;

      // we add a controller
      createController('app/src/controllers/common/newly_created_controller.js', controllerContent);
      expectedCompletionTargets = ['newTarget1', 'newTarget2'];
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(6, 32), (c) =>
        c.includes('newTarget1'),
      );
      assert.deepStrictEqual(actualCompletionTargets.sort(), expectedCompletionTargets.sort());

      // we delete a controller
      deleteController('app/src/controllers/common/newly_created_controller.js');
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(6, 32), (c) => c.length === 0);
      assert.equal(actualCompletionTargets.length, 0);

      // we change the fileWatchPattern
      await updateSettings({ fileWatchPattern: '**/*-controller.{ts}' });
      expectedCompletionTargets = ['commonTsTarget'];
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(7, 35), (c) =>
        c.includes('commonTsTarget'),
      );
      assert.deepStrictEqual(actualCompletionTargets.sort(), expectedCompletionTargets.sort());

      // we autocomplete on a controller that is not being watched
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(8, 35), (c) => c.length === 0);
      // it does not return any targets
      assert.equal(actualCompletionTargets.length, 0);
    });
  });
});
