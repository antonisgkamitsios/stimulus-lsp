import * as vscode from 'vscode';
import * as assert from 'assert';
import {
  activateExtension,
  openDoc,
  resetSettings,
  deleteController,
  waitForCompletions,
  updateSettings,
  createController,
} from '../helper';

describe('data-controller-action completion', () => {
  before(async () => {
    await activateExtension();
  });
  after(async () => {
    await resetSettings();
    deleteController('app/src/controllers/common/newly_created_controller.js'); // ensure we delete it if something fails
  });

  // const position = new vscode.Position(1, 31);

  describe('For html files', () => {
    it('returns the correct actions', async () => {
      const docUri = await openDoc('completion/dataAction.html');

      let actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(1, 18), (c) =>
        c.includes('click'),
      );

      assert.strictEqual(
        ['abort', 'click', 'keydown'].every((a) => actualCompletionTargets.includes(a)),
        true,
      );

      // when we trigger autocomplete on an element with default actions we show also the controllers
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(2, 21), (c) =>
        c.includes('nested--test'),
      );
      //  verify we still show the events
      assert.strictEqual(
        ['abort', 'click', 'keydown'].every((a) => actualCompletionTargets.includes(a)),
        true,
      );
      const expectedCompletionControllers = ['test', 'nested--test', 'nested--with-multiple-gaps'];

      //  verify we show all the controllers
      assert.strictEqual(
        expectedCompletionControllers.every((c) => actualCompletionTargets.includes(c)),
        true,
      );

      //  on arrow we show the controllers
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(3, 25), (c) =>
        c.includes('click->nested--test'),
      );
      assert.strictEqual(
        expectedCompletionControllers.every((c) => actualCompletionTargets.includes(`click->${c}`)),
        true,
      );

      // on # we show the methods
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(4, 38), (c) =>
        c.includes('click->nested--test#foo'),
      );
      const expectedCompletionMethods = ['click->nested--test#foo', 'click->nested--test#bar'];
      assert.deepStrictEqual(actualCompletionTargets.sort(), expectedCompletionMethods.sort());

      // on @ we show the target
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(5, 33), (c) =>
        c.includes('keydown.ctrl+a@document'),
      );
      const expectedCompletionTargets = ['keydown.ctrl+a@document', 'keydown.ctrl+a@window'];
      assert.deepStrictEqual(actualCompletionTargets.sort(), expectedCompletionTargets.sort());

      // on ! we show the options
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(6, 42), (c) =>
        c.includes('click->nested--test#foo:prevent'),
      );
      const expectedCompletionOptions = [
        'click->nested--test#foo:capture',
        'click->nested--test#foo:once',
        'click->nested--test#foo:passive',
        'click->nested--test#foo:!passive',
        'click->nested--test#foo:stop',
        'click->nested--test#foo:prevent',
        'click->nested--test#foo:self',
      ];
      assert.deepStrictEqual(actualCompletionTargets.sort(), expectedCompletionOptions.sort());

      // we change setting
      await updateSettings({ controllersDirs: ['./app/non_existent'] });

      actualCompletionTargets = await waitForCompletions(
        docUri,
        new vscode.Position(2, 21),
        (c) => !c.includes('nested--test'),
      );

      // it does not autocomplete the controllers
      assert.strictEqual(
        expectedCompletionControllers.every((c) => actualCompletionTargets.includes(c)),
        false,
      );

      // we change controllersDirs to multiple folders
      await updateSettings({ controllersDirs: ['./app/src/controllers/common', './app/src/controllers/uncommon'] });

      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(3, 25), (c) =>
        c.includes('click->common'),
      );
      assert.deepStrictEqual(actualCompletionTargets.sort(), ['click->common', 'click->uncommon'].sort());

      // we add a controller

      const controllerContent = `
      import { Controller } from '@hotwired/stimulus';

      export default class extends Controller {
        static targets = ['newTarget1', 'newTarget2'];

				newMethod1(){}

				newMethod2(){}
      }
      `;
      createController('app/src/controllers/common/newly_created_controller.js', controllerContent);
      // expectedCompletionTargets = ['newTarget1', 'newTarget2'];
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(7, 39), (c) =>
        c.includes('click->newly-created#newMethod1'),
      );
      assert.deepStrictEqual(
        actualCompletionTargets.sort(),
        ['click->newly-created#newMethod1', 'click->newly-created#newMethod2'].sort(),
      );

      // we delete a controller
      deleteController('app/src/controllers/common/newly_created_controller.js');
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(7, 39), (c) => c.length === 0);
      assert.equal(actualCompletionTargets.length, 0);

      // we change the fileWatchPattern
      await updateSettings({ fileWatchPattern: '**/*-controller.{ts}' });
      // expectedCompletionTargets = ['commonTsTarget'];
      actualCompletionTargets = await waitForCompletions(docUri, new vscode.Position(8, 42), (c) =>
        c.includes('click->common-ts-dashed#tsDashedMethod'),
      );
      assert.deepStrictEqual(actualCompletionTargets.sort(), ['click->common-ts-dashed#tsDashedMethod']);
    });
  });
});
