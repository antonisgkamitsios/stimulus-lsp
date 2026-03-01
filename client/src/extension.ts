/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, window } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	// Create an output channel for debug logging
	const outputChannel = window.createOutputChannel('Stimulus LSP');
	outputChannel.appendLine('Stimulus LSP Extension activated');
	
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for HTML documents
		documentSelector: [{ scheme: 'file', language: 'html' }],
		synchronize: {
			// Notify the server about changes to controller files
			fileEvents: workspace.createFileSystemWatcher('**/*_controller.{ts,js}') 
		},
		outputChannel: outputChannel,
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'stimulus',
		'Stimulus LSP',
		serverOptions,
		clientOptions
	);

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
