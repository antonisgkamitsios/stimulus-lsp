import * as path from 'path';
import { ExtensionContext, window } from 'vscode';

import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

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

  const clientOptions: LanguageClientOptions = {
    // Register the server for HTML documents
    documentSelector: [{ scheme: 'file', language: 'html' }],
    outputChannel: outputChannel,
  };

  // Create the language client and start the client.
  client = new LanguageClient('stimulus', 'Stimulus LSP', serverOptions, clientOptions);

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
