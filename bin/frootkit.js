#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
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

  let child = null;
  const childEnv = {
    ...process.env,
    FROOT_CLI_SPAWNED: '1',
    FROOT_CWD: targetCwd,
    FROOT_PARENT_PID: String(process.pid),
    FROOT_ROOT_PPID: String(process.ppid || ''),
  };

  if (tsxUrl) {
    child = spawn(process.execPath, ['--import', tsxUrl, cliPath, ...cliArgs], {
      cwd: targetCwd,
      stdio: 'inherit',
      env: childEnv,
      shell: false,
    });
  } else {
    const isWindows = process.platform === 'win32';
    const npxArgs = ['tsx', cliPath, ...cliArgs];
    const execCmd = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'npx';
    const finalArgs = isWindows ? ['/d', '/s', '/c', 'npx', ...npxArgs] : npxArgs;

    child = spawn(execCmd, finalArgs, {
      cwd: targetCwd,
      stdio: 'inherit',
      env: childEnv,
      shell: false,
    });
  }

  const killChild = (signal = 'SIGTERM') => {
    try {
      if (child && !child.killed && child.pid) {
        if (process.platform === 'win32') {
          try {
            spawnSync('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore' });
          } catch {}
        } else {
          try {
            child.kill(signal);
          } catch {}
        }
      }
    } catch {}
  };

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.once('SIGINT', () => {
    killChild('SIGINT');
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    killChild('SIGTERM');
    process.exit(143);
  });
  process.once('SIGBREAK', () => {
    killChild('SIGBREAK');
    process.exit(131);
  });
  process.once('SIGHUP', () => {
    killChild('SIGHUP');
    process.exit(129);
  });
  process.once('exit', () => {
    killChild();
  });

  if (process.stdin && typeof process.stdin.on === 'function') {
    process.stdin.on('end', () => killChild());
    process.stdin.on('close', () => killChild());
  }

  // Parent watcher on Windows: if terminal/pnpm dies, terminate child tree immediately
  if (process.ppid && process.ppid > 1) {
    const parentTimer = setInterval(() => {
      try {
        process.kill(process.ppid, 0);
      } catch {
        clearInterval(parentTimer);
        killChild();
        process.exit(0);
      }
    }, 500);
    parentTimer.unref?.();
  }
} else {
  import('../dist/cli.js');
}
