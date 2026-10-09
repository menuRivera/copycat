import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const workspace = process.env.WORKSPACE_DIR ?? path.join(repoRoot, 'workspace');
const port = Number(process.env.DEMO_PREVIEW_PORT ?? 4401);
const root = process.env.DEMO_PREVIEW_ROOT ?? workspace;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

async function listDirs(parent) {
  try {
    const entries = await readdir(parent, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(parent, entry.name));
  } catch {
    return [];
  }
}

async function newestDirWithIndex() {
  const candidates = [];
  for (const project of await listDirs(root)) {
    candidates.push(...(await listDirs(path.join(project, 'worktrees'))));
  }
  for (const project of await listDirs(root)) {
    candidates.push(path.join(project, 'repo'));
  }

  let best = null;
  let bestMtime = -1;
  for (const dir of candidates) {
    const info = await stat(path.join(dir, 'index.html')).catch(() => null);
    if (info?.isFile() && info.mtimeMs > bestMtime) {
      bestMtime = info.mtimeMs;
      best = dir;
    }
  }
  return best;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');

  if (relative.includes('..')) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid path' }));
    return;
  }

  const dir = await newestDirWithIndex();
  if (!dir) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'no demo worktree or repo found' }));
    return;
  }

  const file = path.join(dir, relative);
  const body = await readFile(file).catch(() => null);
  if (!body) {
    res.writeHead(404, { 'content-type': 'application/json' });
  } else {
    res.writeHead(200, {
      'content-type': contentTypes[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
  }
  res.end(body ?? JSON.stringify({ error: 'not found', dir }));
});

server.listen(port, () => {
  console.log(`demo preview server on http://localhost:${port} (root ${root})`);
});
