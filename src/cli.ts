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
import { createFullstackApp, build as runBuild } from './app.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'dev';

  // Parse optional port, host, cwd, and outDir flags
  let port = Number(process.env['PORT'] || 3000);
  let host = process.env['HOST'] || '0.0.0.0';
  let cwd = process.cwd();
  let outDir: string | undefined;

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
    try {
      const instance = await createFullstackApp({
        cwd,
        port,
        autoListen: false,
      });

      const startServer = (targetPort: number, maxRetries = 10): Promise<{ server: any; port: number }> => {
        return new Promise((resolve, reject) => {
          let currentPort = targetPort;

          const tryListen = () => {
            const server = instance.listen(currentPort);

            server.once('listening', () => {
              resolve({ server, port: currentPort });
            });

            server.once('error', (err: any) => {
              if (err?.code === 'EADDRINUSE') {
                if (isDev && currentPort - targetPort < maxRetries) {
                  console.log(`  - Port ${currentPort} is in use, trying ${currentPort + 1}...`);
                  currentPort++;
                  tryListen();
                } else {
                  reject(
                    new Error(
                      `Port ${currentPort} is already in use. Specify a different port using -p, --port <port> or stop the process running on port ${currentPort}.`
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

main().catch((err) => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});
