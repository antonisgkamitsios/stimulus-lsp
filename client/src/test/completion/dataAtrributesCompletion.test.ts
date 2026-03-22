import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateExtension, openDoc, resetSettings, waitForCompletions, updateSettings } from '../helper';

describe('data attributes completion', () => {
  before(async () => {
    await activateExtension();
  });
  after(async () => {
    await resetSettings();
  });

  // const position = new vscode.Position(1, 31);

  describe('For html files', () => {
    it('returns the correct attributes', async () => {
      const docUri = await openDoc('completion/dataAttributes.html');

      // we change setting
      await updateSettings({ controllersDirs: ['./app/attributeTesting'] });

      let actualCompletionAttributes = await waitForCompletions(docUri, new vscode.Position(1, 10), (c) =>
        c.includes('data-foo-target'),
      );

      const expectedCompletionAttributes = [
        'data-controller',
        'data-action',
        'data-foo-target',
        'data-foo-first-class-class',
        'data-foo-second-class-class',
        'data-foo-first-outlet-outlet',
        'data-foo-first-value-value',
        'data-foo-second-value-value',
        'data-nested--bar-first-class-class',
        'data-nested--bar-second-class-class',
        'data-nested--bar-first-outlet-outlet',
        'data-nested--bar-first-value-value',
        'data-nested--bar-second-value-value',
      ];

      assert.deepStrictEqual(
        actualCompletionAttributes.filter((c) => c.startsWith('data-') && c !== 'data-').sort(),
        expectedCompletionAttributes.sort(),
      );

      // we change to a non existent folder
      await updateSettings({ controllersDirs: ['./app/controllers/nonExistent'] });

      actualCompletionAttributes = await waitForCompletions(
        docUri,
        new vscode.Position(1, 10),
        (c) => !c.includes('data-foo-target'),
      );

      assert.deepStrictEqual(
        actualCompletionAttributes.filter((c) => c.startsWith('data-') && c !== 'data-').sort(),
        ['data-action', 'data-controller'].sort(),
      );
    });
  });
});
