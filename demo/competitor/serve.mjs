import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.DEMO_COMPETITOR_PORT ?? 4400);
const versionFiles = { 1: 'index.html', 2: 'v2.html', 3: 'v3.html' };

function normalizeVersion(value) {
  const parsed = Number(value);
  return versionFiles[parsed] ? parsed : 1;
}

let version = normalizeVersion(process.env.DEMO_COMPETITOR_VERSION ?? 1);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (req.method === 'GET' && url.pathname === '/') {
    const requested = url.searchParams.get('v');
    if (requested) {
      version = normalizeVersion(requested);
    }
    const html = await readFile(path.join(dir, versionFiles[version]));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/version') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    version = normalizeVersion(body.trim());
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
