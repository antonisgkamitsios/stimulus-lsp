import { build } from 'esbuild';

await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  outfile: 'out/server.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  alias: {
    'vscode-html-languageservice': 'vscode-html-languageservice/lib/esm/htmlLanguageService.js',
  },
});
