import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.DEMO_COMPETITOR_PORT ?? 4400);
let version = Number(process.env.DEMO_COMPETITOR_VERSION ?? 1) === 2 ? 2 : 1;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (req.method === 'GET' && url.pathname === '/') {
    const requested = url.searchParams.get('v');
    if (requested) {
      version = Number(requested) === 2 ? 2 : 1;
    }
    const file = version === 2 ? 'v2.html' : 'index.html';
    const html = await readFile(path.join(dir, file));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/version') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    version = Number(body.trim()) === 2 ? 2 : 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ version }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(port, () => {
  console.log(`demo competitor site on http://localhost:${port} (version ${version})`);
  console.log(`switch version: curl -X POST http://localhost:${port}/version -d 2`);
});
