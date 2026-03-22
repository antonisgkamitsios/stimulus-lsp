### This repo structure has been cloned from https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample

# Stimulus LSP - Language Server Protocol Extension

This VS Code extension provides intelligent autocomplete for Stimulus controller names in HTML `data-controller-` attributes.

## Setup

### 1. Install the Extension

Build and install the extension:

```bash
npm install
npm run compile
```

Then launch in debug mode or install it in VS Code.

### 2. Configure Your Controllers Directory

Add the following setting to your `.vscode/settings.json` or workspace settings:

```json
{
  "stimulsp.controllersDirs": ["./app/controllers"]
}
```

Replace `./app/controllers` with the path to your Stimulus controllers directory.

## Features

### Autocomplete for `data-controller` Attributes

As you type `data-controller=""` in HTML files, the extension will:

1. Scan your controllers directory for files matching `*_controller.ts` or `*_controller.js`
2. Extract controller names and convert them to kebab-case
3. Display them as autocomplete suggestions

### Controller Name Conversion

The extension automatically converts file paths to Stimulus controller names:

- `app/controllers/dashboard_controller.ts` → `dashboard`
- `app/controllers/admin_controller.ts` → `admin`
- `app/controllers/form_validator_controller.ts` → `form-validator`
- `app/controllers/admin/users_controller.ts` → `admin--users`
- `app/controllers/nested/deep/item_controller.ts` → `nested--deep--item`

Simply start typing `data-controller=""` and press `Ctrl+Space` (or `Cmd+Space` on Mac) to see available controllers.

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
