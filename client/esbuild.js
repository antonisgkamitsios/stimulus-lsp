import esbuild from 'esbuild';
import { glob } from 'glob';

async function build() {
  const entryPoints = await glob('src/**/*.ts');

  await esbuild.build({
    entryPoints,
    bundle: true,
    outdir: 'out',
    outbase: 'src',
    external: ['vscode', 'mocha'],
    format: 'cjs',
    platform: 'node',
    sourcemap: true,
  });
}

build();
