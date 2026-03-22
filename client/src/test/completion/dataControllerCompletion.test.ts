import * as vscode from 'vscode';
import * as assert from 'assert';
import {
  activateExtension,
  openDoc,
  updateSettings,
  resetSettings,
  createController,
  deleteController,
  waitForCompletions,
  triggerAutoComplete,
} from '../helper';

describe('data-controller completion', () => {
  before(async () => {
    await activateExtension();
  });
  after(async () => {
    await resetSettings();
    deleteController('app/src/controllers/common/newly_created_controller.js'); // ensure we delete it if something fails
  });

  describe('For html files', () => {
    it('returns the correct controllers', async () => {
      const docUri = await openDoc('completion/dataController.html');

      let expectedCompletionControllers = ['test', 'nested--test', 'nested--with-multiple-gaps'];
      let actualCompletionControllers = await triggerAutoComplete(docUri, new vscode.Position(1, 22));

      assert.deepStrictEqual(actualCompletionControllers.sort(), expectedCompletionControllers.sort());

      // we change setting
      await updateSettings({ controllersDirs: ['./app/non_existent'] });

      actualCompletionControllers = await waitForCompletions(docUri, new vscode.Position(1, 22), (c) => c.length === 0);
      // it does not return any controllers
      assert.equal(actualCompletionControllers.length, 0);

      // we change controllersDirs to multiple folders
      await updateSettings({ controllersDirs: ['./app/src/controllers/common', './app/src/controllers/uncommon'] });
      expectedCompletionControllers = ['common', 'uncommon'];
      actualCompletionControllers = await waitForCompletions(docUri, new vscode.Position(1, 22), (c) =>
        c.includes('common'),
      );
      assert.deepStrictEqual(actualCompletionControllers.sort(), expectedCompletionControllers.sort());

      // we add a controller
      createController('app/src/controllers/common/newly_created_controller.js');
      expectedCompletionControllers = ['common', 'uncommon', 'newly-created'];
      actualCompletionControllers = await waitForCompletions(docUri, new vscode.Position(1, 22), (c) =>
        c.includes('newly-created'),
      );
      assert.deepStrictEqual(actualCompletionControllers.sort(), expectedCompletionControllers.sort());

      // we delete a controller
      deleteController('app/src/controllers/common/newly_created_controller.js');
      expectedCompletionControllers = ['common', 'uncommon'];
      actualCompletionControllers = await waitForCompletions(
        docUri,
        new vscode.Position(1, 22),
        (c) => !c.includes('newly-created'),
      );
      assert.deepStrictEqual(actualCompletionControllers.sort(), expectedCompletionControllers.sort());

      // we change the fileWatchPattern
      await updateSettings({ fileWatchPattern: '**/*-controller.{ts}' });
      expectedCompletionControllers = ['common-ts-dashed', 'uncommon-ts-dashed'];
      actualCompletionControllers = await waitForCompletions(docUri, new vscode.Position(1, 22), (c) =>
        c.includes('common-ts-dashed'),
      );
      assert.deepStrictEqual(actualCompletionControllers.sort(), expectedCompletionControllers.sort());
    });
  });

  describe('For erb files', () => {
    it('does not return controllers', async () => {
      const docUri = await openDoc('completion/dataController.erb');

      const actualCompletionControllers = await triggerAutoComplete(docUri, new vscode.Position(1, 22));

      assert.equal(actualCompletionControllers.length, 0);
    });
  });
});
