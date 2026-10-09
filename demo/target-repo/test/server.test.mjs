import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startServer } from '../server.mjs';

let server;

before(async () => {
  server = await startServer(0);
});

after(() => {
  server.close();
});

test('serves the landing page', async () => {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  const html = await response.text();
  assert.match(html, /Demo App/);
});

test('returns 404 for unknown paths', async () => {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/nope`);
  assert.equal(response.status, 404);
});
