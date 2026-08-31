#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const unzipper = require('unzipper');

const forbiddenPatterns = [
  /^extension\/src\//,
  /^extension\/out\//,
  /^extension\/node_modules\//,
  /^extension\/\.graph-it\//,
  /^extension\/wiki\//,
  /^extension\/\.vscode\//,
  /^extension\/\.github\//,
  /^extension\/scripts\//,
  /^extension\/TECH_DEBT_AUDIT\.md$/,
  /^extension\/package-lock\.json$/,
  /\.map$/,
  /\.ts$/,
  /\.vsix$/
];

function resolveVsixPath() {
  const argPath = process.argv[2];
  if (argPath) {
    return path.resolve(argPath);
  }

  const candidates = fs.readdirSync(process.cwd())
    .filter(file => file.endsWith('.vsix'))
    .map(file => {
      const fullPath = path.resolve(file);
      return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (candidates.length === 0) {
    throw new Error('No VSIX found. Run npm run package:vsix first or pass a VSIX path.');
  }

  return candidates[0].fullPath;
}

async function main() {
  const vsixPath = resolveVsixPath();
  if (!fs.existsSync(vsixPath)) {
    throw new Error(`VSIX not found at ${vsixPath}`);
  }

  const directory = await unzipper.Open.file(vsixPath);
  const entries = directory.files.map(file => file.path);
  const forbiddenEntries = entries.filter(entry => forbiddenPatterns.some(pattern => pattern.test(entry)));
  const requiredEntries = [
    'extension/package.json',
    'extension/readme.md',
    'extension/dist/extension.js',
    'extension/medias/logo.png',
    'extension/medias/demo.gif'
  ];
  const missingEntries = requiredEntries.filter(entry => !entries.includes(entry));

  if (forbiddenEntries.length > 0) {
    throw new Error(`Forbidden files found in VSIX:\n${forbiddenEntries.sort().join('\n')}`);
  }

  if (missingEntries.length > 0) {
    throw new Error(`Required files missing from VSIX:\n${missingEntries.join('\n')}`);
  }

  console.log(`VSIX content verified: ${path.basename(vsixPath)} (${entries.length} files)`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
