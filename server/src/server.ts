import * as path from 'path';

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

import { ControllersDir, StimulusSettings } from './types';
import {
  arraysEqual,
  controllerIdentifierFromPath,
  getFullAndRelativeControllerPath,
  getFullControllersPaths,
  normalizePath,
  stripFilePrefix,
} from './utils';
import { ControllersCache } from './controllersCache';

const defaultSettings: StimulusSettings = { controllersDirs: ['./app/controllers'] };
let globalSettings: StimulusSettings = defaultSettings;
let cachedControllersDirs: ControllersDir[] = [];

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let workspaceRoot: string;

const controllersCache = new ControllersCache(connection);

async function updateCache(shouldClear = false) {
  const settings = await getSettings();

  if (arraysEqual(cachedControllersDirs, settings.controllersDirs)) return;

  if (shouldClear) controllersCache.clear();
  controllersCache.readControllersToCache(settings.controllersDirs);
  cachedControllersDirs = settings.controllersDirs;
}

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

async function getSettings(): Promise<StimulusSettings> {
  if (!hasConfigurationCapability) {
    return globalSettings;
  }
  const settings: StimulusSettings = await connection.workspace.getConfiguration({
    section: 'stimulus',
  });
  return settings;
}

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = Boolean(capabilities.workspace?.configuration);
  hasWorkspaceFolderCapability = Boolean(capabilities.workspace?.workspaceFolders);

  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    workspaceRoot = params.workspaceFolders[0].uri;
  } else if (params.rootUri) {
    workspaceRoot = params.rootUri;
  } else if (params.rootPath) {
    workspaceRoot = params.rootPath;
  }
  workspaceRoot = stripFilePrefix(workspaceRoot);
  controllersCache.workspaceRoot = workspaceRoot;

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['"', "'"],
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

connection.onInitialized(async () => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }

  await updateCache();
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((_change) => {
  connection.console.log('onDidChangeContent');
  // Diagnostics will be provided through the diagnostics endpoint
});

connection.onDidChangeConfiguration(async (change) => {
  if (!hasConfigurationCapability) {
    globalSettings = change.settings.stimulus || defaultSettings;
  }

  await updateCache(true);

  // Refresh the diagnostics since the `controllersDir` could have changed.
  connection.languages.diagnostics.refresh();
});

// Monitored files have changed in VSCode
// Check if any controller files were changed
connection.onDidChangeWatchedFiles((change) => {
  const changes = change.changes;
  const hasControllerChanges = changes.some(
    (change) => change.uri.includes('_controller.ts') || change.uri.includes('_controller.js'),
  );

  if (hasControllerChanges) {
    changes.forEach(async (change) => {
      const settings = await getSettings();

      const fullControllersPaths = getFullControllersPaths(workspaceRoot, settings.controllersDirs);

      const [fullControllerPath, relativeControllerPath] = getFullAndRelativeControllerPath(
        change.uri,
        fullControllersPaths,
      );
      if (!relativeControllerPath) {
        return;
      }

      const controllerIdentifier = controllerIdentifierFromPath(relativeControllerPath);

      switch (change.type) {
        case FileChangeType.Created:
          controllersCache.addController(fullControllerPath, controllerIdentifier);

          break;
        case FileChangeType.Changed:
          break;
        case FileChangeType.Deleted:
          controllersCache.deleteController(fullControllerPath);
          break;
      }
    });
  }
});

// This handler provides the initial list of the completion items.
connection.onCompletion(async (textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
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

  if (!dataControllerMatch) {
    return [];
  }

  // Create completion items from controllers
  const completions: CompletionItem[] = [];
  controllersCache.forEach((controllerIdentifier, controllerPath) =>
    completions.push({
      label: controllerIdentifier,
      kind: CompletionItemKind.Class,
      detail: path.relative(workspaceRoot, controllerPath),
      insertText: controllerIdentifier,
    }),
  );

  return completions;
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item;
});

// This handler provides the definition (go to definition) for a symbol
connection.onDefinition(async (textDocumentPosition: TextDocumentPositionParams): Promise<Location[] | null> => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) {
    connection.console.log('[Definition] No document found');
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(textDocumentPosition.position);

  // Get the full line text
  const lineStart = text.lastIndexOf('\n', offset) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineText = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
  const posInLine = offset - lineStart;

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

  if (!word || word.length === 0) {
    return null;
  }

  // Find the controller file(s)
  const controllerPaths = controllersCache.getControllerPathByIdentifier(word);
  if (controllerPaths.length === 0) {
    return null;
  }

  const locations = controllerPaths.map((path) => {
    const normalizedPath = normalizePath(path);
    const fileUri = normalizedPath.startsWith('/') ? 'file://' + normalizedPath : 'file:///' + normalizedPath;

    return {
      uri: fileUri,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    };
  });

  return locations;
});

connection.languages.diagnostics.on(async (_params) => {
  // Return empty diagnostics for now
  return {
    kind: DocumentDiagnosticReportKind.Full,
    items: [],
  } satisfies DocumentDiagnosticReport;
});

// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
