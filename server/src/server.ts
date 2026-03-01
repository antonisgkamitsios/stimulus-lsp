/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	DocumentDiagnosticReportKind,
	type DocumentDiagnosticReport,
	Location,
	FileChangeType,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'fs';
import * as path from 'path';
import { normalizePath, stripFilePrefix } from './utils';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = Boolean(capabilities.workspace?.configuration);
	hasWorkspaceFolderCapability = Boolean(capabilities.workspace?.workspaceFolders);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true,
			},
			// Tell the client that this server supports go to definition.
			definitionProvider: true,
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false,
			},
		},
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true,
			},
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders((_event) => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface StimulusSettings {
	controllersDir: string;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: StimulusSettings = { controllersDir: './app/controllers' };
let globalSettings: StimulusSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings = new Map<string, Thenable<StimulusSettings>>();

interface ControllerInfo {
	filePath: string;
}

// Cache for controllers
let cachedControllersDir = '';
const cachedControllers = new Map<string, ControllerInfo>();

function getRelativeControllerPath(
	fileUri: string,
	fullControllersPath: string,
): string | null {
	try {
		const filePath = stripFilePrefix(fileUri);

		// Get relative path from controllers dir
		const relativePath = path.relative(fullControllersPath, filePath);

		return normalizePath(relativePath);
	} catch (error) {
		connection.console.log(`[readControllers] Error reading controllers: ${error}`);
		return null;
	}
}

function getFullControllersPath(controllersDir: string, workspaceRoot: string): string {
	return path.isAbsolute(controllersDir)
		? controllersDir
		: path.join(workspaceRoot, controllersDir);
}

function getControllerIdentifier(filePath: string): string {
	const relativePath = normalizePath(filePath);
	const withoutExtension = relativePath.replace(/\.[^.]*$/, '');
	const withoutSuffix = withoutExtension.replace(/_controller$/, '');

	const controllerName = withoutSuffix.replace(/\//g, '--').replace(/_/g, '-');

	return controllerName;
}

function readControllersToCache(controllersDir: string, workspaceRoot: string) {
	const fullPath = path.isAbsolute(controllersDir)
		? controllersDir
		: path.join(workspaceRoot, controllersDir);

	connection.console.log(`[readControllers] Looking for controllers at: ${fullPath}`);

	try {
		if (!fs.existsSync(fullPath)) {
			connection.console.log(
				`[readControllers] Directory does not exist: ${fullPath}`,
			);
			return [];
		}

		const walkDir = (dir: string) => {
			const files = fs.readdirSync(dir);
			connection.console.log(
				`[readControllers] Found files in ${dir}: ${files.join(', ')}`,
			);
			for (const file of files) {
				const fullFilePath = path.join(dir, file);
				const stat = fs.statSync(fullFilePath);

				if (stat.isDirectory()) {
					walkDir(fullFilePath);
				} else if (
					file.endsWith('_controller.ts') ||
					file.endsWith('_controller.js')
				) {
					const relativePath = path.relative(fullPath, fullFilePath);
					const controllerName = getControllerIdentifier(relativePath);
					connection.console.log(
						`[readControllers] Found controller: ${file} -> ${controllerName}`,
					);
					cachedControllers.set(controllerName, { filePath: fullFilePath });
				}
			}
		};

		walkDir(fullPath);
	} catch (error) {
		connection.console.log(`[readControllers] Error reading controllers: ${error}`);
	}
}

async function getWorkspaceRoot(fallBackRoot = '.'): Promise<string> {
	const workspaceFolders = (await connection.workspace.getWorkspaceFolders()) || [];

	return workspaceFolders.length > 0
		? stripFilePrefix(workspaceFolders[0].uri)
		: fallBackRoot;
}

connection.onDidChangeConfiguration((change) => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = change.settings.stimulus || defaultSettings;
	}
	// Clear controller cache when settings change
	cachedControllersDir = '';
	// For now lets empty the cache entirely
	cachedControllers.clear();

	connection.console.log('[onDidChangeConfiguration] Cache invalidated');
	// Refresh the diagnostics since the `controllersDir` could have changed.
	connection.languages.diagnostics.refresh();
});

function getDocumentSettings(resource: string): Thenable<StimulusSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'stimulus',
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
	documentSettings.delete(e.document.uri);
});

connection.languages.diagnostics.on(async (_params) => {
	// Return empty diagnostics for now
	return {
		kind: DocumentDiagnosticReportKind.Full,
		items: [],
	} satisfies DocumentDiagnosticReport;
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((_change) => {
	connection.console.log('onDidChangeContent');
	// Diagnostics will be provided through the diagnostics endpoint
});

// Monitored files have changed in VSCode
// Check if any controller files were changed
connection.onDidChangeWatchedFiles((change) => {
	const changes = change.changes;
	const hasControllerChanges = changes.some(
		(change) =>
			change.uri.includes('_controller.ts') || change.uri.includes('_controller.js'),
	);

	if (hasControllerChanges) {
		changes.forEach(async (change) => {
			const settings = await getDocumentSettings(change.uri);
			const wsRoot = await getWorkspaceRoot();
			const fullControllersPath = getFullControllersPath(
				settings.controllersDir,
				wsRoot,
			);
			const relativeControllerPath = getRelativeControllerPath(
				change.uri,
				fullControllersPath,
			);
			if (!relativeControllerPath) {
				return;
			}

			const controllerIdentifier = getControllerIdentifier(relativeControllerPath);

			switch (change.type) {
				case FileChangeType.Created:
					cachedControllers.set(controllerIdentifier, {
						filePath: path.join(fullControllersPath, relativeControllerPath),
					});
					connection.console.log(
						`[onDidChangeWatchedFiles] File created: ${change.uri}`,
					);
					break;
				case FileChangeType.Changed:
					connection.console.log(
						`[onDidChangeWatchedFiles] File changed: ${change.uri}`,
					);
					break;
				case FileChangeType.Deleted:
					if (cachedControllers.delete(controllerIdentifier)) {
						connection.console.log(
							`[onDidChangeWatchedFiles] File deleted: ${change.uri}`,
						);
					}
					break;
			}
		});
	}
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	async (textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
		const document = documents.get(textDocumentPosition.textDocument.uri);
		if (!document) {
			return [];
		}

		const text = document.getText();
		const offset = document.offsetAt(textDocumentPosition.position);

		// Get text from the beginning of the line to current position
		const lineStart = text.lastIndexOf('\n', offset) + 1;
		const lineText = text.substring(lineStart, offset);

		// Check if we're in a data-controller attribute (either data-controller="..." or data-controller-"...")
		const dataControllerMatch = lineText.match(/data-controller(=["'])?([a-z0-9-]*)$/i);
		connection.console.log(`[Stimulus Completion] Line text: "${lineText}"`);
		connection.console.log(
			`[Stimulus Completion] Match: ${dataControllerMatch ? 'MATCHED' : 'NO MATCH'}`,
		);

		if (!dataControllerMatch) {
			return [];
		}

		// Get settings and read controllers
		const settings = await getDocumentSettings(document.uri);
		connection.console.log(
			`[Stimulus Completion] Controllers dir: ${settings.controllersDir}`,
		);

		// Get workspace root from document URI
		const workspaceRoot = path.dirname(document.uri.replace(/^file:\/\//, ''));
		const workspaceFolders = (await connection.workspace.getWorkspaceFolders()) || [];
		const wsRoot =
			workspaceFolders.length > 0
				? workspaceFolders[0].uri.replace(/^file:\/\//, '')
				: workspaceRoot;

		connection.console.log(`[Stimulus Completion] Workspace root: ${wsRoot}`);

		// Read controllers if directory changed
		if (settings.controllersDir !== cachedControllersDir) {
			readControllersToCache(settings.controllersDir, wsRoot);
			cachedControllersDir = settings.controllersDir;
			connection.console.log(
				`[Stimulus Completion] Found ${cachedControllers.size} controllers: ${Array.from(cachedControllers.keys()).join(', ')}`,
			);
		}

		// Create completion items from controllers
		const completions: CompletionItem[] = [];
		cachedControllers.forEach((_controllerInfo, controllerIdentifier) =>
			completions.push({
				label: controllerIdentifier,
				kind: CompletionItemKind.Class,
				detail: 'Stimulus Controller',
				insertText: controllerIdentifier,
			}),
		);

		connection.console.log(
			`[Stimulus Completion] Returning ${completions.length} completions`,
		);
		return completions;
	},
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	return item;
});

// This handler provides the definition (go to definition) for a symbol
connection.onDefinition(
	async (textDocumentPosition: TextDocumentPositionParams): Promise<Location | null> => {
		const document = documents.get(textDocumentPosition.textDocument.uri);
		if (!document) {
			connection.console.log('[Definition] No document found');
			return null;
		}

		const text = document.getText();
		const offset = document.offsetAt(textDocumentPosition.position);

		connection.console.log(
			`[Definition] Text length: ${text.length}, offset: ${offset}`,
		);

		// Get the full line text
		const lineStart = text.lastIndexOf('\n', offset) + 1;
		const lineEnd = text.indexOf('\n', offset);
		const lineText = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
		const posInLine = offset - lineStart;

		connection.console.log(`[Definition] Line text: "${lineText}"`);
		connection.console.log(`[Definition] Position in line: ${posInLine}`);

		// Check if we're in a data-controller attribute
		if (!lineText.includes('data-controller')) {
			connection.console.log('[Definition] Not in data-controller attribute');
			return null;
		}

		// Extract word at cursor
		let wordStart = posInLine;
		let wordEnd = posInLine;

		// Find word boundaries
		while (wordStart > 0 && /[a-z0-9-]/i.test(lineText[wordStart - 1])) {
			wordStart--;
		}
		while (wordEnd < lineText.length && /[a-z0-9-]/i.test(lineText[wordEnd])) {
			wordEnd++;
		}

		const word = lineText.substring(wordStart, wordEnd);
		connection.console.log(`[Definition] Extracted word: "${word}"`);

		if (!word || word.length === 0) {
			connection.console.log('[Definition] No valid word at cursor');
			return null;
		}

		const settings = await getDocumentSettings(document.uri);

		if (settings.controllersDir !== cachedControllersDir) {
			const wsRoot = await getWorkspaceRoot();
			readControllersToCache(settings.controllersDir, wsRoot);
			cachedControllersDir = settings.controllersDir;
			connection.console.log(
				`[Stimulus Completion] Found ${cachedControllers.size} controllers: ${Array.from(cachedControllers.keys()).join(', ')}`,
			);
		}

		// Find the controller file
		const controllerInfo = cachedControllers.get(word);
		if (!controllerInfo) {
			connection.console.log(`[Definition] Controller file not found for: ${word}`);
			return null;
		}

		connection.console.log(`[Definition] Found controller file: ${controllerInfo}`);

		// Return the location (file URI and position)
		// Ensure proper file URI format with forward slashes
		const normalizedPath = normalizePath(controllerInfo.filePath);
		const fileUri = normalizedPath.startsWith('/')
			? 'file://' + normalizedPath
			: 'file:///' + normalizedPath;

		connection.console.log(`[Definition] File URI: ${fileUri}`);

		return {
			uri: fileUri,
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 },
			},
		};
	},
);

// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
