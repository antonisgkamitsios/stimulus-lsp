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
  "stimulus.controllersDir": "./app/controllers"
}
```

Replace `./app/controllers` with the path to your Stimulus controllers directory.

## Features

### Autocomplete for `data-controller-` Attributes

As you type `data-controller-` in HTML files, the extension will:

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

## Usage Example

In your HTML file:

```html
<div data-controller-dashboard>
  <!-- content -->
</div>

<div data-controller-form-validator>
  <!-- content -->
</div>

<div data-controller-admin--users>
  <!-- content -->
</div>
```

Simply start typing `data-controller-` and press `Ctrl+Space` (or `Cmd+Space` on Mac) to see available controllers.

## Configuration

### `stimulus.controllersDir`

- **Type:** `string`
- **Default:** `./app/controllers`
- **Description:** The directory path (relative to workspace root) where your Stimulus controller files are located.

## Supported File Extensions

The extension looks for controller files with these patterns:
- `*_controller.ts`
- `*_controller.js`

## Requirements

- VS Code 1.56.0 or higher
- HTML files in your workspace

## Notes

- The extension caches controller names for performance. When you change the `controllersDir` setting, the cache is automatically refreshed.
- The extension only provides completions for `data-controller-` attributes in HTML files.
- Controller names are sorted alphabetically for consistent suggestions.
