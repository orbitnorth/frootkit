#!/usr/bin/env node
/**
 * FrootKit Command-Line Interface (Next.js-style CLI).
 * Commands:
 *   frootkit dev   - Start dev server with hot reload, Tailwind v4 watcher & API routes
 *   frootkit build - Build static site (SSG) with compiled Tailwind CSS and API routes manifest
 *   frootkit start - Start production HTTP server with static file caching & dynamic API routes
 *   frootkit create - Scaffold a new FrootKit project
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { createFullstackApp, build as runBuild } from './app.js';
import { ensureImportAlias } from './alias.js';

/**
 * Finds the Process ID (PID) currently listening on a TCP port.
 */
export function getPidOnPort(port: number): number | null {
  try {
    if (process.platform === 'win32') {
      const stdout = execSync(`netstat -ano -p tcp`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      for (const line of stdout.split('\n')) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1] || '', 10);
          if (pid && pid !== process.pid) return pid;
        }
      }
    } else {
      const stdout = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const pid = parseInt(stdout.trim().split('\n')[0] || '', 10);
      if (pid && pid !== process.pid) return pid;
    }
  } catch {}
  return null;
}

/**
 * Forcefully terminates any process tree listening on a TCP port.
 */
export function killProcessOnPort(port: number): boolean {
  const pid = getPidOnPort(port);
  if (!pid) return false;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'dev';

  // Parse optional port, host, cwd, and outDir flags
  let port = Number(process.env['PORT'] || 3000);
  let host = process.env['HOST'] || '0.0.0.0';
  let cwd = process.cwd();
  let outDir: string | undefined;
  const shouldKillPort =
    args.includes('-k') ||
    args.includes('--kill') ||
    args.includes('-f') ||
    args.includes('--force') ||
    Boolean(process.env['FROOT_KILL_PORT']);

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '-p' || args[i] === '--port') && args[i + 1]) {
      port = Number(args[i + 1]);
    }
    if ((args[i] === '-H' || args[i] === '--host') && args[i + 1]) {
      host = String(args[i + 1]);
    }
    if ((args[i] === '-C' || args[i] === '--cwd') && args[i + 1]) {
      cwd = path.resolve(process.cwd(), args[i + 1] || '.');
    }
    if ((args[i] === '-o' || args[i] === '--out-dir' || args[i] === '--outDir') && args[i + 1]) {
      outDir = path.resolve(cwd, args[i + 1] || '.');
    }
  }

  if (cwd !== process.cwd()) {
    try {
      process.chdir(cwd);
    } catch {}
  }
  process.env['FROOT_CWD'] = cwd;
  ensureImportAlias({ cwd });

  if (command === 'build') {
    process.env['NODE_ENV'] = 'production';
    process.env['FROOT_BUILD'] = 'true';
    console.log('\n  ▲ FrootKit (Next.js-Style App Router & Static Site Generator)\n');
    try {
      const result = await runBuild({ cwd, ...(outDir ? { outDir } : {}) });
      console.log(`\n  ✓ Production static export ready at ${result.outDir}`);
      console.log(`  ✓ Rendered ${result.renderedRoutes.length} pages:`);
      for (const r of result.renderedRoutes) {
        console.log(`     - ${r}`);
      }

      // Check for API routes manifest
      const manifestPath = path.join(result.outDir, 'routes-manifest.json');
      if (fsSync.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
          if (Array.isArray(manifest.apiRoutes) && manifest.apiRoutes.length > 0) {
            console.log(`\n  ✓ Discovered ${manifest.apiRoutes.length} dynamic API routes:`);
            for (const api of manifest.apiRoutes) {
              console.log(`     - [${api.methods.join(', ')}] ${api.pattern}`);
            }
          }
        } catch {}
      }

      console.log('');
      process.exit(0);
    } catch (err) {
      console.error('\n  ✕ Build failed:', err);
      process.exit(1);
    }
  } else if (command === 'dev' || command === 'start') {
    const isDev = command === 'dev';
    if (!isDev) {
      process.env['NODE_ENV'] = 'production';
    }

    console.log(`\n  ▲ FrootKit ${isDev ? 'Development' : 'Production'} Server\n`);

    // If requested with --kill or -k, terminate any stale process holding the port
    if (shouldKillPort) {
      const existingPid = getPidOnPort(port);
      if (existingPid) {
        console.log(`  - Terminating existing process on port ${port} (PID: ${existingPid})...`);
        killProcessOnPort(port);
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    try {
      const instance = await createFullstackApp({
        cwd,
        port,
        autoListen: false,
      });

      let serverInstance: any = null;
      let isShuttingDown = false;

      const cleanupAndExit = (code = 0) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        try {
          if (serverInstance) {
            if (typeof serverInstance.closeAllConnections === 'function') {
              serverInstance.closeAllConnections();
            }
            if (typeof serverInstance.closeIdleConnections === 'function') {
              serverInstance.closeIdleConnections();
            }
            serverInstance.close();
          }
        } catch {}
        try {
          instance.close();
        } catch {}
        process.exit(code);
      };

      process.once('SIGINT', () => cleanupAndExit(0));
      process.once('SIGTERM', () => cleanupAndExit(0));
      process.once('SIGBREAK', () => cleanupAndExit(0));
      process.once('SIGHUP', () => cleanupAndExit(0));
      process.once('exit', () => cleanupAndExit(0));

      if (process.stdin && typeof process.stdin.on === 'function') {
        process.stdin.on('end', () => cleanupAndExit(0));
        process.stdin.on('close', () => cleanupAndExit(0));
      }

      // Heartbeat: detect if parent process (e.g. pnpm, cmd, terminal tab) has terminated
      const parentPids = [
        process.ppid,
        Number(process.env['FROOT_PARENT_PID']),
        Number(process.env['FROOT_ROOT_PPID']),
      ].filter((p) => p && p > 1 && !isNaN(p));

      if (parentPids.length > 0) {
        const parentWatcher = setInterval(() => {
          for (const p of parentPids) {
            try {
              process.kill(p, 0);
            } catch (err: any) {
              if (err?.code === 'ESRCH') {
                clearInterval(parentWatcher);
                cleanupAndExit(0);
                return;
              }
            }
          }
        }, 500);
        parentWatcher.unref?.();
      }

      const startServer = (targetPort: number, maxRetries = 10): Promise<{ server: any; port: number }> => {
        return new Promise((resolve, reject) => {
          let currentPort = targetPort;

          const tryListen = () => {
            const server = instance.listen(currentPort, undefined, { maxRetries: 0 });
            serverInstance = server;

            server.once('listening', () => {
              resolve({ server, port: currentPort });
            });

            server.once('error', (err: any) => {
              if (err?.code === 'EADDRINUSE') {
                const existingPid = getPidOnPort(currentPort);

                if (shouldKillPort && existingPid) {
                  console.log(`  - Terminating process on port ${currentPort} (PID: ${existingPid})...`);
                  killProcessOnPort(currentPort);
                  setTimeout(() => tryListen(), 250);
                  return;
                }

                if (isDev && currentPort - targetPort < maxRetries) {
                  const pidNote = existingPid ? ` (occupied by PID ${existingPid})` : '';
                  console.log(`  - Port ${currentPort} is in use${pidNote}, trying ${currentPort + 1}...`);
                  currentPort++;
                  tryListen();
                } else {
                  reject(
                    new Error(
                      `Port ${currentPort} is already in use. Specify a different port using -p, --port <port>, or use --kill (-k) to terminate the stale process.`
                    )
                  );
                }
              } else {
                reject(err);
              }
            });
          };

          tryListen();
        });
      };

      const { port: boundPort } = await startServer(port);
      const displayHost = host === '0.0.0.0' ? 'localhost' : host;
      console.log(`  - Local:    http://${displayHost}:${boundPort}`);
      console.log(`  - Routes:   ${instance.appDir}`);
      console.log(`  - Engine:   Monomorphic V8 + Preact SSR + Next.js API Routes\n`);

      const apis = instance.router.getApiRoutes();
      if (apis.length > 0) {
        console.log(`  API Routes:`);
        for (const api of apis) {
          console.log(`    • ${api.methods.join(', ').padEnd(16)} http://${displayHost}:${boundPort}${api.pattern}`);
        }
        console.log('');
      }
    } catch (err: any) {
      console.error(`\n  ✕ Failed to start server: ${err?.message || err}`);
      process.exit(1);
    }
  } else if (command === 'create' || command === 'init') {
    const createArgs = args.slice(1);
    const { spawn } = await import('node:child_process');
    const isWindows = process.platform === 'win32';
    const npxArgs = ['create-frootkit@latest', ...createArgs];
    const execCmd = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'npx';
    const finalArgs = isWindows ? ['/d', '/s', '/c', 'npx', ...npxArgs] : npxArgs;

    const child = spawn(execCmd, finalArgs, {
      stdio: 'inherit',
      shell: false,
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  } else if (command === '--help' || command === '-h' || command === 'help') {
    console.log(`
  ▲ FrootKit — High-Performance Next.js Alternative

  Usage:
    frootkit [command] [options]

  Commands:
    dev      Start development server with Tailwind CSS compilation & hot reload
    build    Build and export static site with compiled Tailwind CSS into .froot
    start    Start production HTTP server with dynamic API routes and static assets
    create   Scaffold a new FrootKit project

  Options:
    -p, --port <port>       Port to listen on (default: 3000)
    -k, --kill              Terminate any stale process holding the requested port
    -H, --host <host>       Host address (default: 0.0.0.0)
    -C, --cwd <path>        Project root directory (default: current directory)
    -o, --out-dir <path>    Static output directory (default: .froot)
    -h, --help              Show help information
`);
    process.exit(0);
  } else {
    console.error(`Unknown command: ${command}. Run "frootkit --help" for available commands.`);
    process.exit(1);
  }
}

const isEntryScript =
  process.env['FROOT_CLI_SPAWNED'] === '1' ||
  (process.argv[1] &&
    (process.argv[1].endsWith('cli.js') ||
      process.argv[1].endsWith('frootkit.js') ||
      process.argv[1].endsWith('frootkit')));

if (isEntryScript) {
  main().catch((err) => {
    console.error('Fatal CLI error:', err);
    process.exit(1);
  });
}
