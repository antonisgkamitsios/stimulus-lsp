import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateExtension, openDoc, updateSettings, resetSettings, waitFor } from './helper';

describe('Definition', () => {
  before(async () => {
    await activateExtension();
  });
  after(async () => {
    await resetSettings();
  });

  describe('For html files', () => {
    it('returns the correct definition', async () => {
      let docUri = await openDoc('definition/definitionController.html');

      const position = new vscode.Position(1, 25);

      let definitionLocations = await waitForDefinition(docUri, position, (locs) => locs !== null && locs.length > 0);

      assert.equal(definitionLocations?.length, 1);

      assert.match(definitionLocations?.[0].uri.path as string, /nested\/with_multiple_gaps_controller.js/);

      // we change setting
      await updateSettings({ controllersDirs: ['./app/non_existent'] });

      definitionLocations = await waitForDefinition(docUri, position, (locs) => locs?.length === 0);
      // it does not return any definitions
      assert.equal(definitionLocations?.length, 0);

      // we change controllersDirs to multiple folders
      docUri = await openDoc('definition/definitionControllerMultiple.html');
      await updateSettings({ controllersDirs: ['./app/src/controllers/common', './app/src/controllers/uncommon'] });

      definitionLocations = await waitForDefinition(docUri, position, (locs) => locs !== null && locs.length > 0);

      assert.match(definitionLocations?.[0].uri.path as string, /common\/common_controller.js/);

      // we change the fileWatchPattern
      docUri = await openDoc('definition/definitionControllerDashed.html');
      await updateSettings({ fileWatchPattern: '**/*-controller.{ts}' });
      definitionLocations = await waitForDefinition(docUri, position, (locs) => locs !== null && locs.length > 0);

      assert.match(definitionLocations?.[0].uri.path as string, /common\/common-ts-dashed-controller.ts/);
    });
  });

  describe('For erb files', () => {
    it('does not return definitions', async () => {
      const docUri = await openDoc('definition/definitionController.erb');
      const definitionLocations = await triggerDefinition(docUri, new vscode.Position(1, 25));

      assert.equal(definitionLocations?.length, 0);
    });
  });
});

async function waitForDefinition(
  docUri: vscode.Uri,
  position: vscode.Position,
  predicate: (locations: vscode.Location[] | null) => boolean,
): Promise<vscode.Location[] | null> {
  return waitFor(docUri, position, triggerDefinition, predicate);
}

async function triggerDefinition(docUri: vscode.Uri, position: vscode.Position): Promise<vscode.Location[] | null> {
  const test = await vscode.commands.executeCommand<vscode.Location[] | null>(
    'vscode.executeDefinitionProvider',
    docUri,
    position,
  );
  return test;
}
