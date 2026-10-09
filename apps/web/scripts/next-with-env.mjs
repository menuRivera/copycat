import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const webDir = path.resolve(import.meta.dirname, '..');
const rootEnv = path.resolve(import.meta.dirname, '../../..', '.env');

if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const nextBin = path.join(webDir, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: webDir,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
