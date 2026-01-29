import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function main(): Promise<void> {
  // Parse --vsix=<path> or --vsix <path>
  const argv = process.argv.slice(2);
  let vsixArg: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--vsix=')) { vsixArg = arg.split('=')[1]; break; }
    if (arg === '--vsix' && argv[i + 1]) { vsixArg = argv[i + 1]; break; }
  }

  // If not provided, try to find a .vsix in the repo root
  let vsixPath: string | undefined = vsixArg;
  if (!vsixPath) {
    const candidates = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.vsix'));
    if (candidates.length === 0) {
      console.error('No .vsix found in the repo root. Run `npm run package` or pass `--vsix <path>`');
      process.exit(1);
    }
    vsixPath = path.join(process.cwd(), candidates[0]);
  }
  vsixPath = path.resolve(vsixPath);
  if (!fs.existsSync(vsixPath)) {
    console.error(`VSIX not found at ${vsixPath}`);
    process.exit(1);
  }

  console.log(`Using VSIX: ${vsixPath}`);

  // Download VS Code and get paths
  console.log('Downloading VS Code...');
  const vscodeExecutablePath = await downloadAndUnzipVSCode();
  const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);

  // Install the VSIX into the downloaded VS Code instance
  console.log('Installing VSIX into test instance...');
  try {
    await execFileAsync(cliPath, ['--install-extension', vsixPath]);
  } catch (err: any) {
    console.error('Failed to install VSIX into test instance:', err?.message ?? err);
    process.exit(1);
  }

  // Ensure compiled tests exist in out/test/suite
  const extensionTestsPath = path.resolve(__dirname, '../suite/index');
  if (!fs.existsSync(extensionTestsPath + '.js') && !fs.existsSync(extensionTestsPath + '.ts')) {
    console.error(`Compiled test runner not found at ${extensionTestsPath}. Did you run 'npm run compile'?`);
    process.exit(1);
  }

  // Run tests using the downloaded VS Code (which has the VSIX installed)
  console.log('Launching VS Code and running tests...');
  await runTests({ extensionDevelopmentPath: path.resolve(__dirname, '../../'), extensionTestsPath });
}

void main().catch(err => { //NOSONAR
  console.error('Failed to run VSIX-based tests', err);
  process.exit(1);
});
