import { runTests } from '@vscode/test-electron';
import * as path from 'node:path';

void (async () => {
  const versionArgIndex = process.argv.indexOf('--vscode-version');
  const version = process.env.VSCODE_TEST_VERSION || (versionArgIndex >= 0 ? process.argv[versionArgIndex + 1] : undefined) || 'stable';

  // The folder containing the Extension Manifest package.json
  // Passed to `--extensionDevelopmentPath`
  const extensionDevelopmentPath = path.resolve(__dirname, '../..');

  // The path to test runner
  // Passed to --extensionTestsPath
  const extensionTestsPath = path.resolve(__dirname, './suite/index');

  // Download VS Code, unzip it and run the integration test
  await runTests({ version, extensionDevelopmentPath, extensionTestsPath });
})().catch(err => { //NOSONAR
  console.error('Failed to run tests', err);
  process.exit(1);
});
