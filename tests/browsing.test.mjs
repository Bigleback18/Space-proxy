import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import server from '../netlify/server/index.mjs';
import { resolvePublicHost } from '../netlify/server/wisp.mjs';

let base;
before(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

test('browser transport assets are served as JavaScript', async () => {
  for (const path of ['/baremux/index.js', '/baremux/worker.js', '/libcurl/index.mjs', '/epoxy/index.mjs']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /javascript/);
    await response.body.cancel();
  }
});

test('private and loopback destinations are rejected', async () => {
  for (const host of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fc00::1']) {
    await assert.rejects(resolvePublicHost(host), /not a public website/);
  }
});

test('WebSocket upgrades from another site are refused', async () => {
  const ws = new WebSocket(base.replace('http:', 'ws:') + '/wisp/', { origin: 'https://another-site.example' });
  const [error] = await once(ws, 'error');
  assert.match(error.message, /403/);
});

test('Wisp handshake works and refuses private targets and non-web ports', async () => {
  const ws = new WebSocket(base.replace('http:', 'ws:') + '/wisp/', { origin: base });
  const greeting = once(ws, 'message');
  await once(ws, 'open');
  assert.equal((await greeting)[0][0], 3);
  for (const [id, port] of [[1, 80], [2, 22]]) {
    const host = Buffer.from('127.0.0.1');
    const frame = Buffer.alloc(8 + host.length);
    frame[0] = 1;
    frame.writeUInt32LE(id, 1);
    frame[5] = 1;
    frame.writeUInt16LE(port, 6);
    host.copy(frame, 8);
    const reply = once(ws, 'message');
    ws.send(frame);
    const [data] = await reply;
    assert.equal(data[0], 4);
    assert.equal(data.readUInt32LE(1), id);
  }
  ws.close();
  await once(ws, 'close');
});
