#!/usr/bin/env node
/**
 * Froot Fullstack Command-Line Interface (Next.js-style CLI).
 * Commands:
 *   froot-fullstack dev   - Start dev server with hot reload and Tailwind watcher
 *   froot-fullstack build - Build static site (SSG) with compiled Tailwind CSS
 *   froot-fullstack start - Start production HTTP server
 */

import * as path from 'node:path';
import { createFullstackApp, build as runBuild } from './app.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'dev';

  // Parse optional port, cwd, and outDir flags
  let port = Number(process.env['PORT'] || 3000);
  let cwd = process.cwd();
  let outDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '-p' || args[i] === '--port') && args[i + 1]) {
      port = Number(args[i + 1]);
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
    console.log('\n  ▲ FrootKit (Next.js-Style Static Site Generator)\n');
    try {
      const result = await runBuild({ cwd, ...(outDir ? { outDir } : {}) });
      console.log(`\n  ✓ Production static export ready at ${result.outDir}`);
      console.log(`  ✓ Rendered ${result.renderedRoutes.length} routes:`);
      for (const r of result.renderedRoutes) {
        console.log(`     - ${r}`);
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

      instance.listen(port, () => {
        console.log(`  - Local:    http://localhost:${port}`);
        console.log(`  - Routes:   ${instance.appDir}`);
        console.log(`  - Engine:   Monomorphic V8 + Preact SSR\n`);
      });
    } catch (err) {
      console.error('\n  ✕ Failed to start server:', err);
      process.exit(1);
    }
  } else if (command === 'create' || command === 'init') {
    const projectDir = args[1] || 'my-frootkit-app';
    const targetDir = path.resolve(cwd, projectDir);
    console.log(`\n  ▲ Scaffolding FrootKit project into ${targetDir}...\n`);
    try {
      const { scaffoldProject } = await import('../../create-frootkit/dist/index.js');
      const res = await scaffoldProject({
        targetDir,
        projectName: path.basename(targetDir),
        pkgManager: 'npm',
        gitInit: true,
      });
      console.log(`  ✓ Created ${res.fileCount} files`);
      console.log(`\n  Next steps:\n    $ cd ${projectDir}\n    $ npm install\n    $ npm run dev\n`);
      process.exit(0);
    } catch {
      // Fallback to npx
      const { spawn } = await import('node:child_process');
      const isWindows = process.platform === 'win32';
      const npxCmd = isWindows ? 'npx.cmd' : 'npx';
      const child = spawn(npxCmd, ['create-froot-fullstack', projectDir], {
        stdio: 'inherit',
        shell: isWindows,
      });
      child.on('exit', (code) => process.exit(code ?? 0));
    }
  } else if (command === '--help' || command === '-h' || command === 'help') {
    console.log(`
Usage: froot-fullstack [command] [options]

Commands:
  dev     Start fullstack development server with Tailwind CSS compilation
  build   Build and export static site with zero configuration
  start   Start production server
  create  Scaffold a new Froot Fullstack (Next.js Alternative) project

Options:
  -p, --port <port>   Port to listen on (default: 3000)
  -C, --cwd <path>    Project working directory (default: process.cwd())
  -h, --help          Show help message
`);
    process.exit(0);
  } else {
    console.error(`Unknown command: ${command}. Use "froot-fullstack --help" for available commands.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});
