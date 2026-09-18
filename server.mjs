import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const securityHeaders = {
  // The original glassware/plots use inline styles, but scripts must be local files.
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-cache',
  'Content-Type': 'text/plain; charset=utf-8',
};

export function createLabServer({ host = '127.0.0.1' } = {}) {
  const server = createServer({ maxHeaderSize: 8192 }, async (req, res) => {
    for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value);
    try {
      // With the default loopback binding, reject foreign Host headers (DNS rebinding).
      const authority = req.headers.host || '';
      const localPort = server.address()?.port;
      const localAuthorities = ['localhost', '127.0.0.1', '[::1]'].map(h => `${h}:${localPort}`);
      if (localPort === 80) localAuthorities.push('localhost', '127.0.0.1', '[::1]');
      if (loopbackHosts.has(host) && !localAuthorities.includes(authority.toLowerCase())) {
        res.writeHead(403).end('Forbidden host');
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
      }
      if (!req.url.startsWith('/') || req.url.startsWith('//')) {
        res.writeHead(400).end('Bad request');
        return;
      }
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const allowed = path === '/' || path === '/index.html' || /^\/src\/[a-z-]+\.(js|css)$/.test(path);
      const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
      if (!allowed || !file.startsWith(root + sep)) {
        res.writeHead(404).end('Not found');
        return;
      }
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Content-Length': content.length });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      res.writeHead(error instanceof URIError ? 400 : 404).end(error instanceof URIError ? 'Bad request' : 'Not found');
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 32;
  server.maxRequestsPerSocket = 100;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('--port');
  const hostIndex = args.indexOf('--host');
  const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || 5174);
  const host = hostIndex >= 0 ? args[hostIndex + 1] : '127.0.0.1';
  if (!Number.isInteger(port) || port < 0 || port > 65535 || !host || host.startsWith('--')) {
    throw new Error('Supply a valid --host and a --port between 0 and 65535.');
  }
  const server = createLabServer({ host });
  server.listen(port, host, () => console.log(`Titravelle is ready at http://${host.includes(':') ? `[${host}]` : host}:${server.address().port}`));
}
