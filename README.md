### This repo structure has been cloned from https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample

# Stimulus LSP - Language Server Protocol Extension

A VS Code extension that provides autocomplete for your stimulus js controllers

### 2. Configure Your Controllers Directory

Add the following setting to your `.vscode/settings.json` or workspace settings:

```json
{
  "stimulsp.controllersDirs": ["./app/controllers"]
}
```

Replace [`./app/controllers`] with the paths to your Stimulus controllers directories.

## Features

### Autocomplete for `data-controller`

As you type `data-controller=""` in HTML files, the extension will:

1. Scan your controllers directory for files matching `*_controller.ts` or `*_controller.js`
2. Extract controller names and convert them to kebab-case
3. Display them as autocomplete suggestions

### Autocomplete for `data-action`

Type `data-action=""` and you see an the autocomplete being updated as you type.
We support events, targets (`@document` or `@window`) controller methods + options (`:prevent` etc)

### Autocomplete for data attributes
Type `data-` and you see an extended list of all the values, classes, outlets, targets that your controllers support

### Autocomplete for `data-[identifier]-target`
Type `data-[identifier]-target` and all the targets that are registered to that controller (matching the identifier) will show

### Jump to definition for all the above
We provide a smart jump to definition for all the cases above. and we try to jump to the correct place on the controller as well!

## Configuration

### `stimulsp.controllersDirs`

- **Type:** `array`
- **Default:** `['./app/controllers']`
- **Description:** The directory paths (relative to workspace root) where your Stimulus controller files are located.

### `stimulsp.fileWatchPattern`

- **Type:** `string`
- **Default:** `**/*_controller.{ts,js}`
- **Description:** Glob pattern for files to watch for controller changes.

### `stimulsp.activationLanguages`

- **Type:** `array`
- **Default:** `['html']`
- **Description:** Languages that Stimulus LSP will activate on.

## Setup locally

### 1. Install the Extension

Build and install the extension:

```bash
pnpm install
pnpm compile
```

Run e2e test:
```bash
pnpm run test
```

Run server tests:
```bash
cd server
pnpm run test
```
