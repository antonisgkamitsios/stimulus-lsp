import { build } from 'esbuild';

build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  outfile: 'out/server.js',
  external: ['vscode', 'vscode-html-languageservice'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
});