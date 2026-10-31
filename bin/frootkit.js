#!/usr/bin/env node
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../dist/cli.js');

const isWindows = process.platform === 'win32';
const tsxBinName = isWindows ? 'tsx.cmd' : 'tsx';

let targetCwd = process.cwd();
const cliArgs = [...process.argv.slice(2)];
for (let i = 0; i < cliArgs.length; i++) {
  if (cliArgs[i] === '-C' || cliArgs[i] === '--cwd') {
    if (cliArgs[i + 1]) {
      targetCwd = path.resolve(process.cwd(), cliArgs[i + 1]);
      cliArgs[i + 1] = '.';
    }
  }
}

function findTsx() {
  const candidates = [
    path.join(targetCwd, 'node_modules', '.bin', tsxBinName),
    path.join(process.cwd(), 'node_modules', '.bin', tsxBinName),
    path.join(targetCwd, 'node_modules', 'froot-kit', 'node_modules', '.bin', tsxBinName),
    path.join(targetCwd, 'node_modules', '@orbitnorth/frootkit', 'node_modules', '.bin', tsxBinName),
    path.resolve(__dirname, '../node_modules/.bin', tsxBinName),
    path.resolve(__dirname, '../../.bin', tsxBinName),
    path.resolve(__dirname, '../../../.bin', tsxBinName),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

if (!process.env['FROOT_CLI_SPAWNED']) {
  const tsxPath = findTsx();
  const execCmd = tsxPath || (isWindows ? 'npx.cmd' : 'npx');
  const execArgs = tsxPath ? [cliPath, ...cliArgs] : ['tsx', cliPath, ...cliArgs];

  const child = spawn(execCmd, execArgs, {
    cwd: targetCwd,
    stdio: 'inherit',
    env: { ...process.env, FROOT_CLI_SPAWNED: '1', FROOT_CWD: targetCwd },
    shell: isWindows,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  import('../dist/cli.js');
}
