#!/usr/bin/env node
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../dist/cli.js');

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

if (!process.env['FROOT_CLI_SPAWNED']) {
  let tsxUrl = null;
  const requireCandidates = [
    path.join(targetCwd, 'package.json'),
    path.join(__dirname, '../package.json'),
  ];

  for (const pkgJson of requireCandidates) {
    try {
      if (fs.existsSync(pkgJson)) {
        const req = createRequire(pkgJson);
        const resolved = req.resolve('tsx');
        if (resolved) {
          tsxUrl = pathToFileURL(resolved).href;
          break;
        }
      }
    } catch {}
  }

  if (tsxUrl) {
    const child = spawn(process.execPath, ['--import', tsxUrl, cliPath, ...cliArgs], {
      cwd: targetCwd,
      stdio: 'inherit',
      env: { ...process.env, FROOT_CLI_SPAWNED: '1', FROOT_CWD: targetCwd },
      shell: false,
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  } else {
    const isWindows = process.platform === 'win32';
    const npxArgs = ['tsx', cliPath, ...cliArgs];
    const execCmd = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'npx';
    const finalArgs = isWindows ? ['/d', '/s', '/c', 'npx', ...npxArgs] : npxArgs;

    const child = spawn(execCmd, finalArgs, {
      cwd: targetCwd,
      stdio: 'inherit',
      env: { ...process.env, FROOT_CLI_SPAWNED: '1', FROOT_CWD: targetCwd },
      shell: false,
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  }
} else {
  import('../dist/cli.js');
}
