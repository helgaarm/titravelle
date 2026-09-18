import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { createLabServer } from '../server.mjs';

const server = createLabServer();
let port;
before(async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  port = server.address().port;
});
after(() => new Promise(resolve => server.close(resolve)));
function get(path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers: { Host: `127.0.0.1:${port}`, ...headers }, setHost: false, agent: false }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('server serves only application entry point and local source assets', async () => {
  for (const [path, type] of [['/', 'text/html'], ['/index.html?test=1', 'text/html'], ['/src/main.js', 'text/javascript'], ['/src/styles.css', 'text/css']]) {
    const res = await get(path);
    assert.equal(res.status, 200, path);
    assert.ok(res.headers['content-type'].startsWith(type));
    assert.ok(res.body.length > 0);
  }
});
test('server excludes Git metadata, credentials, tests, reports and path traversal', async () => {
  for (const path of ['/.git/config', '/.env', '/package.json', '/server.mjs', '/test/server.test.js', '/artifacts/browser-results.json', '/src/', '/src/../LICENSE', '/src/%2e%2e/.git/config', '/src/..%2f..%2f.env', '/src/%5c..%5c.env', '/src/nonexistent.js']) {
    assert.equal((await get(path)).status, 404, path);
  }
});
test('server rejects malformed paths and absolute/protocol-relative request targets', async () => {
  for (const path of ['/src/%ZZ.js', '/src/%00.js', '//evil.example/src/main.js', 'http://evil.example/src/main.js']) {
    assert.ok([400, 404].includes((await get(path)).status), path);
  }
});
test('server blocks cross-site Host headers on the default loopback binding', async () => {
  for (const host of [`evil.example:${port}`, `localhost.evil.example:${port}`, `localhost:${port + 1}`, `user@localhost:${port}`, '']) {
    assert.equal((await get('/', { headers: { Host: host } })).status, 403, host);
  }
  for (const host of [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]) {
    assert.equal((await get('/', { headers: { Host: host } })).status, 200, host);
  }
});
test('server permits HEAD but rejects write and preflight methods', async () => {
  const head = await get('/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.ok(Number(head.headers['content-length']) > 0);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE']) {
    const res = await get('/', { method });
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.allow, 'GET, HEAD');
  }
});
test('security headers protect successful and error responses without allowing remote scripts or CORS', async () => {
  for (const [path, options] of [['/', {}], ['/missing', {}], ['/', { method: 'POST' }], ['/', { headers: { Host: 'evil.example' } }]]) {
    const { headers } = await get(path, options);
    assert.match(headers['content-security-policy'], /script-src 'self';/);
    assert.match(headers['content-security-policy'], /script-src-attr 'none';/);
    assert.match(headers['content-security-policy'], /frame-ancestors 'none';/);
    assert.match(headers['content-security-policy'], /form-action 'none'/);
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.equal(headers['x-frame-options'], 'DENY');
    assert.equal(headers['referrer-policy'], 'no-referrer');
    assert.equal(headers['cross-origin-resource-policy'], 'same-origin');
    assert.match(headers['permissions-policy'], /camera=\(\)/);
    assert.equal(headers['access-control-allow-origin'], undefined);
    assert.equal(headers['x-powered-by'], undefined);
  }
});
