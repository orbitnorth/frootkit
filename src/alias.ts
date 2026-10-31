/**
 * Automatic Next.js-Style Import Alias Configuration (@/* -> ./src/* or ./*).
 * Ensures tsconfig.json or jsconfig.json has `@/*` path mapping configured by default.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface EnsureAliasOptions {
  cwd?: string;
  alias?: string;
  target?: string;
}

/**
 * Strips single-line and multi-line comments from JSON string.
 */
export function stripJsonComments(jsonString: string): string {
  return jsonString
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^\\:])\/\/.*$/gm, '$1');
}

/**
 * Ensures that the project has `@/*` import alias configured in tsconfig.json or jsconfig.json.
 * Like Next.js, this runs automatically on server start and build time.
 */
export function ensureImportAlias(options: EnsureAliasOptions = {}): {
  configured: boolean;
  filePath: string;
  alias: string;
  target: string;
} {
  const cwd = path.resolve(options.cwd || process.cwd());
  const hasSrc = fs.existsSync(path.join(cwd, 'src')) && fs.statSync(path.join(cwd, 'src')).isDirectory();
  const alias = options.alias || '@/*';
  const defaultTarget = hasSrc ? './src/*' : './*';
  const target = options.target || defaultTarget;

  const tsConfigPath = path.join(cwd, 'tsconfig.json');
  const jsConfigPath = path.join(cwd, 'jsconfig.json');

  let targetConfigPath = tsConfigPath;
  let isTypeScript = true;

  if (fs.existsSync(tsConfigPath)) {
    targetConfigPath = tsConfigPath;
    isTypeScript = true;
  } else if (fs.existsSync(jsConfigPath)) {
    targetConfigPath = jsConfigPath;
    isTypeScript = false;
  } else {
    // Check if project has typescript files
    const hasTsFiles = (dir: string): boolean => {
      try {
        if (!fs.existsSync(dir)) return false;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory() && !['node_modules', '.git', '.froot', 'dist'].includes(e.name)) {
            if (hasTsFiles(path.join(dir, e.name))) return true;
          } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
            return true;
          }
        }
      } catch {}
      return false;
    };

    isTypeScript = hasTsFiles(cwd);
    targetConfigPath = isTypeScript ? tsConfigPath : jsConfigPath;
  }

  // If config file already exists, read and update if paths is missing
  if (fs.existsSync(targetConfigPath)) {
    try {
      const raw = fs.readFileSync(targetConfigPath, 'utf8');
      const cleanJson = stripJsonComments(raw);
      const parsed = JSON.parse(cleanJson);

      parsed.compilerOptions = parsed.compilerOptions || {};
      const compilerOptions = parsed.compilerOptions;

      compilerOptions.baseUrl = compilerOptions.baseUrl || '.';
      compilerOptions.paths = compilerOptions.paths || {};

      if (!compilerOptions.paths[alias]) {
        compilerOptions.paths[alias] = [target];
        fs.writeFileSync(targetConfigPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
        return { configured: true, filePath: targetConfigPath, alias, target };
      }

      return { configured: false, filePath: targetConfigPath, alias, target };
    } catch {
      // If parsing failed, overwrite with valid config below
    }
  }

  // Create new config file with default Next.js-style options
  const newConfig = isTypeScript
    ? {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          baseUrl: '.',
          paths: {
            [alias]: [target],
          },
          jsx: 'react-jsx',
          jsxImportSource: 'preact',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: hasSrc ? ['src/**/*'] : ['app/**/*', '**/*'],
      }
    : {
        compilerOptions: {
          baseUrl: '.',
          paths: {
            [alias]: [target],
          },
        },
        include: hasSrc ? ['src/**/*'] : ['app/**/*', '**/*'],
      };

  fs.writeFileSync(targetConfigPath, JSON.stringify(newConfig, null, 2) + '\n', 'utf8');
  return { configured: true, filePath: targetConfigPath, alias, target };
}
