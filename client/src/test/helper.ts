import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { defaultSettings, LSP_ID, StimulusSettings } from 'shared';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;

/**
 * Activates the vscode.lsp-sample extension
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
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);
    await sleep(2000);

    return docUri;
  } catch (e) {
    console.error(e);
  }

  return docUri;
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

export function createController(path: string) {
  fs.writeFileSync(getDocPath(path), '');
}

export function deleteController(path: string) {
  const filePath = getDocPath(path);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getDocPath = (p: string) => {
  return path.resolve(__dirname, '../../testFixture', p);
};
export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<boolean> {
  const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  return editor.edit((eb) => eb.replace(all, content));
}
