/* eslint-disable no-console */
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

function stdout(line) {
  process.stdout.write(line.endsWith('\n') ? line : `${line}\n`);
}

function stderr(line) {
  process.stderr.write(line.endsWith('\n') ? line : `${line}\n`);
}

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Extract metafile path from --metafile=path argument
const metafileArg = process.argv.find(arg => arg.startsWith('--metafile='));
const metafilePath = metafileArg ? metafileArg.split('=')[1] : null;

/** @type {import('esbuild').Plugin} */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => stdout('[watch] build started'));
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        stderr(`✘ [ERROR] ${text}`);
        if (location) {
          stderr(`    ${location.file}:${location.line}:${location.column}:`);
        }
      });
      stdout('[watch] build finished');
    });
  },
};

function saveMetafile(filePath, result) {
  const resolvedPath = path.resolve(filePath);
  fs.writeFileSync(resolvedPath, JSON.stringify(result.metafile, null, 2));
  stdout(`✓ Metafile saved to ${resolvedPath}`);
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [esbuildProblemMatcherPlugin],
    target: 'node16',
    metafile: !!metafilePath,
  });

  if (watch) {
    await ctx.watch();
  } else {
    const result = await ctx.rebuild();
    if (metafilePath) {
      saveMetafile(metafilePath, result);
    }
    await ctx.dispose();
  }
}

main().catch((e) => { //NOSONAR
  stderr(String(e));
  process.exit(1);
});
