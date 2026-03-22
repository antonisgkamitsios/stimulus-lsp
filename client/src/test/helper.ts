import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { defaultSettings, LSP_ID, StimulusSettings } from 'shared';

const MAX_TIMEOUT = 5000;
const POLL_TIMEOUT = 50;

/**
 * Activates the extension
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function activateExtension(): Promise<vscode.Extension<any>> {
  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension('antonisgkamitsios.stimulus-lsp')!;
  await ext.activate();

  return ext;
}

export async function openDoc(path: string): Promise<vscode.Uri> {
  const docUri = getDocUri(path);
  const doc = await vscode.workspace.openTextDocument(docUri);
  await vscode.window.showTextDocument(doc);

  // Wait until LSP responds to completion requests for this document

  const getCompletionList = async (docUri: vscode.Uri, position: vscode.Position) => {
    await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', docUri, position);

    return docUri;
  };

  return await waitFor(
    docUri,
    new vscode.Position(0, 0),
    getCompletionList,
    (complList) => complList !== null && complList !== undefined,
  );
}

export async function updateSettings(settings: Partial<StimulusSettings>) {
  const config = vscode.workspace.getConfiguration(LSP_ID);
  for (const [key, val] of Object.entries(settings)) {
    await config.update(key, val, vscode.ConfigurationTarget.Workspace);
  }
}

export async function resetSettings() {
  const config = vscode.workspace.getConfiguration(LSP_ID);

  for (const [key] of Object.entries(defaultSettings)) {
    if (key === 'activationLanguages') continue;
    await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
  }
}

export function createController(path: string, content = '') {
  fs.writeFileSync(getDocPath(path), content);
}

export function deleteController(path: string) {
  const filePath = getDocPath(path);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getDocUri(p: string) {
  return vscode.Uri.file(getDocPath(p));
}

export async function waitForCompletions(
  docUri: vscode.Uri,
  position: vscode.Position,
  predicate: (completions: string[]) => boolean,
): Promise<string[]> {
  return waitFor(docUri, position, triggerAutoComplete, predicate);
}

export async function triggerAutoComplete(docUri: vscode.Uri, position: vscode.Position): Promise<string[]> {
  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualCompletionList = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position,
  )) as vscode.CompletionList;

  return actualCompletionList.items
    .filter((item) => item.kind !== vscode.CompletionItemKind.Text)
    .map((item) => item.label.toString());
}

export async function waitFor<T>(
  docUri: vscode.Uri,
  position: vscode.Position,
  fn: (docUri: vscode.Uri, position: vscode.Position) => Promise<T>,
  predicate: (arg: T) => boolean,
  timeout = MAX_TIMEOUT,
): Promise<T> {
  const start = Date.now();

  let res: T;
  while (Date.now() - start < timeout) {
    res = await fn(docUri, position);

    if (predicate(res)) {
      return res;
    }

    await sleep(POLL_TIMEOUT);
  }

  // @ts-expect-error its not used before initialized, whe while loop will always happen once
  throw new Error(`Timed out waiting for function to match predicate.\nThe returned values were: \n${res}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDocPath(p: string) {
  return path.resolve(__dirname, '../../testFixture', p);
}
