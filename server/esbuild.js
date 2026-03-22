import { build } from 'esbuild';
import { cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  outfile: 'out/server.js',
  external: ['vscode', 'vscode-html-languageservice'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
}).then(() => {
  const src = resolve(__dirname, '../node_modules/vscode-html-languageservice');
  const dest = resolve(__dirname, 'out/node_modules/vscode-html-languageservice');
  cpSync(src, dest, { recursive: true });
});
