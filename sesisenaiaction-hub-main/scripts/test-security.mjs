import assert from 'node:assert/strict';
import test from 'node:test';
import { createSecureServer, securityHeaders } from './serve-secure.mjs';
import { readFile } from 'node:fs/promises';
import { verifyHosting } from './verify-hosting.mjs';
import { createServer } from 'node:http';
const built = JSON.parse(await readFile('dist/security-config.json', 'utf8'));

test('every locked path uses the reviewed dependency versions', async () => {
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const expected = { browserslist: '4.29.3', postcss: '8.5.30', 'postcss-selector-parser': '7.1.6', 'source-map-js': '1.2.2', 'react-router': '7.18.4', 'react-router-dom': '7.18.4' };
  for (const [name, version] of Object.entries(expected)) {
    const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith(`node_modules/${name}`));
    assert.ok(copies.length, `${name} must exist`);
    for (const [path, info] of copies) assert.equal(info.version, version, path);
  }
  assert.ok(!Object.keys(lock.packages).some(path => path.endsWith('node_modules/@remix-run/router')));
});

test('production routes and assets carry protective response headers', async () => {
  const server = createSecureServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const html = await readFile('dist/index.html', 'utf8');
    const script = html.match(/src="([^"]+\.js)"/)[1];
    for (const path of ['/auth', '/dashboard', '/plans/example/edit', script, '/missing.js']) {
      const response = await fetch(origin + path);
      assert.equal(response.status, path === '/missing.js' ? 404 : 200);
      for (const [name, value] of Object.entries(built.headers)) assert.equal(response.headers.get(name), value);
      if (path === '/auth') assert.equal(await response.text(), html);
    }
    assert.equal((await fetch(origin + '/auth', { method: 'POST' })).status, 405);
    assert.equal((await fetch(origin + '/%ZZ')).status, 400);
    assert.match(await verifyHosting(origin), /verified/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('external hosting verification refuses insecure URLs and credentials', async () => {
  await assert.rejects(verifyHosting('http://example.test'), /HTTPS origin/);
  await assert.rejects(verifyHosting('https://user:password@example.test'), /HTTPS origin/);
});

test('a public-looking page without response protections fails hosting verification', async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<div id="root"></div><script src="/app.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(verifyHosting(`http://127.0.0.1:${server.address().port}`), /missing CSP frame-ancestors/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('CSP limits connections to the configured Supabase origin', () => {
  const csp = securityHeaders('https://example.supabase.co')['Content-Security-Policy'];
  assert.match(csp, /connect-src 'self' https:\/\/example.supabase.co wss:\/\/example.supabase.co;/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.throws(() => securityHeaders('https://example.test/path'));
  assert.throws(() => securityHeaders('http://example.test'));
  assert.throws(() => securityHeaders());
  assert.throws(() => createSecureServer({ supabaseOrigin: 'https://wrong.supabase.co' }));
});

test('static deployment artifacts use the same policy and origin as the server', async () => {
  const headers = await readFile('dist/_headers', 'utf8');
  for (const [name, value] of Object.entries(built.headers)) assert.ok(headers.includes(`  ${name}: ${value}\n`));
  const html = await readFile('dist/index.html', 'utf8');
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'));
  assert.ok(!html.match(/<meta[^>]+frame-ancestors/));
  assert.match(html, /name="referrer" content="strict-origin-when-cross-origin"/);
  assert.ok(html.includes(built.authOrigin));
  assert.ok(html.includes(built.dataOrigin));
  const connect=built.headers['Content-Security-Policy'].split(';').find(d=>d.trim().startsWith('connect-src'));
  assert.equal(connect.trim(), `connect-src 'self' ${built.authOrigin} ${built.dataOrigin}`);
  assert.ok(!connect.includes('supabase.co'));
});
