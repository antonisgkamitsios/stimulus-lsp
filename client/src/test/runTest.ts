import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../../');

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './index');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-'));

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        path.resolve(__dirname, '../../../client/testFixture'),
        '--user-data-dir',
        tmpDir, // fresh profile every run
        '--no-sandbox',
      ],
    });
  } catch {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
