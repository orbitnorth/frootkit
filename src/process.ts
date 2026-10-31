import { execSync, spawnSync } from 'node:child_process';

/**
 * Finds the Process ID (PID) currently listening on a TCP port.
 */
export function getPidOnPort(port: number, excludeCurrentProcess: boolean = false): number | null {
  try {
    if (process.platform === 'win32') {
      const stdout = execSync(`netstat -ano -p tcp`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      for (const line of stdout.split('\n')) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1] || '', 10);
          if (pid && (!excludeCurrentProcess || pid !== process.pid)) return pid;
        }
      }
      return null;
    }
    const stdout = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const pid = parseInt(stdout.trim().split('\n')[0] || '', 10);
    return pid && (!excludeCurrentProcess || pid !== process.pid) ? pid : null;
  } catch {
    return null;
  }
}

/**
 * Force terminates a process listening on a port.
 */
export function killProcessOnPort(port: number): boolean {
  const pid = getPidOnPort(port, true);
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
