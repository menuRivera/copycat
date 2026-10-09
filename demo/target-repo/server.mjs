import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

export function startServer(port = Number(process.env.PORT ?? 4402)) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
    const file = path.join(dir, relative);
    const body = await readFile(file).catch(() => null);
    if (!body) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));

if (isDirectRun) {
  const port = Number(process.env.PORT ?? 4402);
  startServer(port).then(() => {
    console.log(`demo target app on http://localhost:${port}`);
  });
}
