import * as path from 'path';
import { commands, ExtensionContext, window, workspace, WorkspaceConfiguration } from 'vscode';

import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { StimulusSettings, defaultSettings, LSP_ID } from 'shared';

let client: LanguageClient;

function getSetting<K extends keyof StimulusSettings>(
  configuration: WorkspaceConfiguration,
  key: K,
): StimulusSettings[K] {
  return configuration.get(key) ?? defaultSettings[key];
}

function getPrefixedSettingKey(string: keyof StimulusSettings): string {
  return `${LSP_ID}.${string}`;
}

export function activate(context: ExtensionContext) {
  // Create an output channel for debug logging
  const outputChannel = window.createOutputChannel('Stimulus LSP');
  outputChannel.appendLine('Stimulus LSP Extension activated');

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };
  const stimulusConfig = workspace.getConfiguration(LSP_ID);
  const activationLanguages = getSetting(stimulusConfig, 'activationLanguages');

  const clientOptions: LanguageClientOptions = {
    documentSelector: activationLanguages.map((lang) => ({ scheme: 'file', language: lang })),
    outputChannel: outputChannel,
  };

  workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(getPrefixedSettingKey('activationLanguages'))) {
      window
        .showInformationMessage('Stimulus LSP: Reload window to apply changes.', 'Reload Window')
        .then((selection) => {
          if (selection === 'Reload Window') {
            commands.executeCommand('workbench.action.reloadWindow');
          }
        });
    }
  });

  // Create the language client and start the client.
  client = new LanguageClient(LSP_ID, 'Stimulus LSP', serverOptions, clientOptions);

  // Start the client. This will also launch the server
  client.start();
  outputChannel.appendLine('Stimulus LSP Server started');
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
